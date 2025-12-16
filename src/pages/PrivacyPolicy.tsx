import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Camera, ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <>
      <SEOHead 
        title="Privacy Policy - Camera Stream | Your Privacy Matters"
        description="Learn how Camera Stream protects your privacy. Our privacy-first approach means your camera data stays on your devices."
        keywords="camera stream privacy policy, data protection, privacy-focused camera, security camera privacy"
        canonical="https://www.rpicamalert.xyz/privacy"
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Our Commitment to Privacy</h2>
              <p className="text-muted-foreground">
                Camera Stream is built with privacy as a fundamental principle. We believe your security camera footage and personal data should remain under your control. This policy explains how we handle your information and protect your privacy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-2 mt-6">Account Information</h3>
              <p className="text-muted-foreground mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Email address (for authentication and notifications)</li>
                <li>Password (stored securely using industry-standard hashing)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-6">Camera Configuration</h3>
              <p className="text-muted-foreground mb-4">
                We store your camera settings to provide the service:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Camera names and URLs</li>
                <li>Camera credentials (encrypted)</li>
                <li>Motion detection settings</li>
                <li>Notification preferences</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-6">What We Do NOT Collect</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Video footage or recordings — these stay on your devices</li>
                <li>Camera feed content — streams are processed locally in your browser</li>
                <li>Location data</li>
                <li>Tracking cookies for advertising</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Provide and maintain the Camera Stream service</li>
                <li>Send motion detection alerts to your email (when enabled)</li>
                <li>Authenticate your access to your cameras</li>
                <li>Improve and optimize our service</li>
                <li>Respond to support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Storage & Security</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Local-First Architecture:</strong> Camera Stream is designed so that your video data never leaves your local network unless you explicitly choose to share it. Video processing, motion detection, and recording all happen in your browser.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Encrypted Credentials:</strong> Camera passwords and sensitive credentials are encrypted before being stored in our database.
              </p>
              <p className="text-muted-foreground">
                <strong>Secure Infrastructure:</strong> Our backend services are hosted on Supabase with enterprise-grade security, including encryption at rest and in transit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">We use the following third-party services:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Supabase:</strong> Database and authentication (hosted in the US/EU)</li>
                <li><strong>Email Service:</strong> For sending motion alerts and account notifications</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not sell your data to third parties or use it for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your camera configurations</li>
                <li>Opt out of email notifications</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, contact us at <a href="mailto:support@camerastream.live" className="text-primary hover:underline">support@camerastream.live</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your account information and camera configurations for as long as your account is active. If you delete your account, we will delete your data within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
              <p className="text-muted-foreground">
                Camera Stream is not intended for use by children under 16. We do not knowingly collect personal information from children under 16.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by email or through the service. Your continued use of Camera Stream after changes become effective constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
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

export default PrivacyPolicy;
