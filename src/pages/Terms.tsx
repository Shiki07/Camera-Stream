import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Camera, ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <>
      <SEOHead 
        title="Terms of Service - Camera Stream | User Agreement"
        description="Terms and conditions for using Camera Stream security camera monitoring service. Read our user agreement and service policies."
        keywords="camera stream terms of service, user agreement, terms and conditions, service policy, legal terms"
        canonical="https://www.camerastream.live/terms"
      />
      <StructuredData 
        type="page"
        pageTitle="Terms of Service"
        pageDescription="Terms and conditions for using Camera Stream"
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Camera Stream</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using Camera Stream ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Camera Stream provides a web-based platform for monitoring security cameras, including features such as live video streaming, motion detection, email alerts, and local recording capabilities. The Service is currently provided free of charge.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-4">To use Camera Stream, you must:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Create an account with a valid email address</li>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Be at least 16 years of age</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">You agree to use Camera Stream only for lawful purposes. You may NOT use the Service to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Monitor individuals without their knowledge or consent where required by law</li>
                <li>Violate any local, state, national, or international laws</li>
                <li>Infringe on the privacy rights of others</li>
                <li>Record in locations where recording is prohibited</li>
                <li>Distribute or share recorded footage without appropriate consent</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Privacy and Data</h2>
              <p className="text-muted-foreground mb-4">
                Your use of the Service is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Key points:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Video footage is processed locally in your browser and is not uploaded to our servers</li>
                <li>You are responsible for any recordings you create and their storage</li>
                <li>Camera credentials are encrypted before storage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Camera Stream software, interface, and documentation are the property of Camera Stream and its licensors. The Service includes open-source components which are subject to their respective licenses. You may not copy, modify, or distribute the Service except as permitted by applicable open-source licenses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Service Availability</h2>
              <p className="text-muted-foreground">
                We strive to maintain Service availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We are not liable for any loss or damage resulting from Service unavailability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR REQUIREMENTS, BE UNINTERRUPTED, SECURE, OR ERROR-FREE. YOU USE THE SERVICE AT YOUR OWN RISK.
              </p>
              <p className="text-muted-foreground mt-4">
                Camera Stream is a monitoring tool and should not be your sole security measure. We recommend using multiple security systems and following local security best practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAMERA STREAM AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR SECURITY BREACHES, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless Camera Stream and its operators from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any rights of third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
              <p className="text-muted-foreground">
                We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion. You may delete your account at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                <a href="mailto:support@camerastream.live" className="text-primary hover:underline">support@camerastream.live</a>
              </p>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Camera Stream. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Terms;
