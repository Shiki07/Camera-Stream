import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64url encoding for VAPID
function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Base64url decoding
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - base64.length % 4) % 4;
  const padded = base64 + '='.repeat(padding);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Convert VAPID private key to CryptoKey
async function importVapidPrivateKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = base64urlDecode(base64Key);
  return await crypto.subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Create VAPID JWT
async function createVapidJwt(endpoint: string, privateKey: CryptoKey, publicKey: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: expiry,
    sub: 'mailto:notifications@camalert.com'
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (64 bytes)
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigArray.length === 64) {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  } else {
    // DER format - parse it
    let offset = 2; // Skip sequence header
    const rLength = sigArray[offset + 1];
    offset += 2;
    r = sigArray.slice(offset, offset + rLength);
    offset += rLength + 2;
    const sLength = sigArray[offset - 1];
    s = sigArray.slice(offset, offset + sLength);
    
    // Pad or trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) r = new Uint8Array([...new Array(32 - r.length).fill(0), ...r]);
    if (s.length < 32) s = new Uint8Array([...new Array(32 - s.length).fill(0), ...s]);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsignedToken}.${base64urlEncode(rawSig)}`;
}

// Generate encryption keys for push message
async function generateEncryptionKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  return { keyPair, publicKeyRaw: new Uint8Array(publicKeyRaw), salt };
}

// Encrypt the push message payload
async function encryptPayload(
  payload: string,
  clientPublicKey: Uint8Array,
  clientAuth: Uint8Array,
  serverKeyPair: CryptoKeyPair,
  serverPublicKey: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> {
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  );

  // HKDF to derive encryption key
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive PRK
  const prkBits = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: clientAuth.buffer as ArrayBuffer, 
      info: new TextEncoder().encode('WebPush: info\0') 
    },
    sharedSecretKey,
    256
  );

  const prkKey = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveBits']);

  // Derive CEK
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: salt.buffer as ArrayBuffer, 
      info: cekInfo 
    },
    prkKey,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: salt.buffer as ArrayBuffer, 
      info: nonceInfo 
    },
    prkKey,
    96
  );

  // Encrypt with AES-GCM
  const cekKey = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
  
  // Add padding delimiter
  const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2]);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBits },
    cekKey,
    paddedPayload
  );

  // Build the encrypted content
  const recordSize = 4096;
  const header = new Uint8Array(5 + 65 + 1 + serverPublicKey.length);
  const view = new DataView(header.buffer);
  
  header.set(salt, 0);
  view.setUint32(16, recordSize, false);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

interface PushRequest {
  userId: string;
  title: string;
  body: string;
  url?: string;
  cameraId?: string;
  imageData?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Push notification request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      throw new Error("VAPID keys not configured");
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      throw new Error("Supabase credentials not configured");
    }

    // Create client with user's auth to verify their identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub;
    console.log(`Authenticated user: ${authenticatedUserId}`);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, title, body, url, cameraId } = await req.json() as PushRequest;

    // Authorization check: users can only send notifications to themselves
    if (userId !== authenticatedUserId) {
      console.error(`Authorization denied: user ${authenticatedUserId} attempted to send notification to ${userId}`);
      return new Response(
        JSON.stringify({ error: "Not authorized to send notifications to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to user: ${userId}, title: ${title}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    const privateKey = await importVapidPrivateKey(vapidPrivateKey);
    const results = [];

    for (const sub of subscriptions) {
      try {
        console.log(`Processing subscription: ${sub.endpoint.substring(0, 50)}...`);

        // Generate encryption keys
        const { keyPair, publicKeyRaw, salt } = await generateEncryptionKeys();

        // Create the notification payload
        const payload = JSON.stringify({
          title,
          body,
          url: url || "/",
          tag: `motion-${cameraId || 'alert'}-${Date.now()}`,
          icon: "/favicon.ico",
          badge: "/favicon.ico"
        });

        // Encrypt the payload
        const clientPublicKey = base64urlDecode(sub.p256dh);
        const clientAuth = base64urlDecode(sub.auth);
        
        const encryptedPayload = await encryptPayload(
          payload,
          clientPublicKey,
          clientAuth,
          keyPair,
          publicKeyRaw,
          salt
        );

        // Create VAPID JWT
        const jwt = await createVapidJwt(sub.endpoint, privateKey, vapidPublicKey);

        // Send the push notification
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400"
          },
          body: encryptedPayload.buffer as ArrayBuffer
        });

        console.log(`Push response status: ${response.status}`);

        if (response.status === 410 || response.status === 404) {
          // Subscription is no longer valid, remove it
          console.log("Subscription expired, removing...");
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "removed" });
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error(`Push failed: ${response.status} - ${errorText}`);
          results.push({ endpoint: sub.endpoint, status: "failed", error: errorText });
        } else {
          console.log("Push sent successfully");
          results.push({ endpoint: sub.endpoint, status: "sent" });
        }
      } catch (e) {
        console.error(`Error sending to subscription:`, e);
        results.push({ endpoint: sub.endpoint, status: "error", error: String(e) });
      }
    }

    const successCount = results.filter(r => r.status === "sent").length;
    console.log(`Push complete: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
