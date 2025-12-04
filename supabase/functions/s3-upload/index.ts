import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface S3UploadRequest {
  filename: string;
  fileData: string; // base64 encoded
  contentType: string;
  path: string;
  bucketName: string;
  region: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: S3UploadRequest = await req.json();
    const { filename, fileData, contentType, path, bucketName, region } = body;

    if (!filename || !fileData || !bucketName) {
      throw new Error('Missing required fields');
    }

    // Get S3 credentials from user's local config (passed through securely)
    // In production, you'd store these in Supabase secrets or vault
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      // Fall back to returning instructions for manual setup
      console.log('AWS credentials not configured in edge function secrets');
      return new Response(
        JSON.stringify({
          error: 'S3 credentials not configured',
          message: 'Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your Supabase Edge Function secrets'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Decode base64 file data
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const key = `${path}/${filename}`;
    const s3Url = `https://${bucketName}.s3.${region || 'us-east-1'}.amazonaws.com/${key}`;

    // Create AWS Signature V4
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const regionName = region || 'us-east-1';
    const serviceName = 's3';

    // Create canonical request
    const method = 'PUT';
    const canonicalUri = '/' + key;
    const canonicalQueryString = '';
    
    const payloadHash = await crypto.subtle.digest('SHA-256', bytes);
    const payloadHashHex = Array.from(new Uint8Array(payloadHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const headers: Record<string, string> = {
      'host': `${bucketName}.s3.${regionName}.amazonaws.com`,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHashHex,
      'content-type': contentType,
      'content-length': bytes.length.toString()
    };

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key}:${headers[key]}\n`)
      .join('');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHashHex
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${regionName}/${serviceName}/aws4_request`;
    
    const canonicalRequestHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(canonicalRequest)
    );
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHashHex
    ].join('\n');

    // Calculate signature
    const getSignatureKey = async (key: string, dateStamp: string, region: string, service: string) => {
      const kDate = await hmacSha256(`AWS4${key}`, dateStamp);
      const kRegion = await hmacSha256(kDate, region);
      const kService = await hmacSha256(kRegion, service);
      return await hmacSha256(kService, 'aws4_request');
    };

    const hmacSha256 = async (key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> => {
      const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
    };

    const signingKey = await getSignatureKey(awsSecretAccessKey, dateStamp, regionName, serviceName);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to S3
    const uploadResponse = await fetch(s3Url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Authorization': authorizationHeader
      },
      body: bytes
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 upload error:', errorText);
      throw new Error(`S3 upload failed: ${uploadResponse.status}`);
    }

    console.log('S3 upload successful:', key);

    return new Response(
      JSON.stringify({
        success: true,
        key,
        location: s3Url,
        bucket: bucketName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('S3 upload error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Upload failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
