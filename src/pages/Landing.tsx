import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Camera, Shield, Bell, Smartphone, Cloud, Zap, 
  Eye, Lock, Settings, Monitor, HardDrive, Wifi, HelpCircle
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const Landing = () => {
  return (
    <>
      <SEOHead 
        title="Camera Stream - Smart Security Camera Monitoring System | Motion Detection & Alerts"
        description="Professional security camera monitoring system with real-time motion detection, instant email alerts, local storage, and privacy-focused design. Free and open-source camera management."
        keywords="security camera system, camera motion detection, home security system, webcam monitoring, surveillance system, motion alerts, privacy camera, local storage camera, multi-camera dashboard"
        canonical="https://www.camerastream.live/"
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Camera Stream</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Your Cameras, One
            <span className="text-primary block mt-2">Smart Dashboard</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Privacy-focused, open-source camera monitoring with real-time motion detection, 
            instant email alerts, and local storage. Works with webcams, IP cameras, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Start Monitoring Free
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </a>
          </div>
        </header>

        {/* Features Section */}
        <section id="features" className="bg-muted/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Powerful Security Features
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Everything you need to secure your home or office with any camera
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Eye className="h-8 w-8" />}
                title="Real-Time Motion Detection"
                description="Advanced algorithms detect movement instantly with configurable sensitivity zones and thresholds."
              />
              <FeatureCard
                icon={<Bell className="h-8 w-8" />}
                title="Instant Email Alerts"
                description="Receive immediate notifications when motion is detected. Never miss important security events."
              />
              <FeatureCard
                icon={<HardDrive className="h-8 w-8" />}
                title="Local Storage Recording"
                description="Store recordings directly on your device. Full control over your security footage."
              />
              <FeatureCard
                icon={<Lock className="h-8 w-8" />}
                title="Privacy-First Design"
                description="Your data stays on your hardware. No cloud uploads required, no third-party access."
              />
              <FeatureCard
                icon={<Smartphone className="h-8 w-8" />}
                title="Mobile-Friendly Interface"
                description="Monitor your cameras from any device with our responsive web interface."
              />
              <FeatureCard
                icon={<Wifi className="h-8 w-8" />}
                title="Multi-Camera Support"
                description="Connect webcams, IP cameras, and network cameras. Manage everything from one dashboard."
              />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose Camera Stream?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <BenefitItem
                icon={<Shield className="h-6 w-6 text-primary" />}
                title="Complete Privacy Control"
                description="Unlike cloud-based cameras, your footage never leaves your network unless you choose to share it."
              />
              <BenefitItem
                icon={<Zap className="h-6 w-6 text-primary" />}
                title="100% Free"
                description="Completely free to use — no upfront costs, no monthly fees, no hidden charges. Just sign up and start monitoring."
              />
              <BenefitItem
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Fully Customizable"
                description="Adjust motion sensitivity, detection zones, recording schedules, and alert preferences."
              />
              <BenefitItem
                icon={<Monitor className="h-6 w-6 text-primary" />}
                title="Any Camera Works"
                description="Support for webcams, USB cameras, IP cameras, RTSP streams, and Raspberry Pi cameras."
              />
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="bg-muted/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Perfect For Any Security Need
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Whether you're protecting your home, office, or monitoring wildlife, Camera Stream adapts to your needs
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <UseCaseCard
                title="Home Security"
                description="Monitor entry points, driveways, and outdoor areas. Get alerts when unexpected visitors arrive."
                items={["Front door monitoring", "Package delivery alerts", "Night vision support"]}
              />
              <UseCaseCard
                title="Small Business"
                description="Affordable security solution for shops, offices, and warehouses without expensive contracts."
                items={["After-hours surveillance", "Employee-free zones", "Inventory protection"]}
              />
              <UseCaseCard
                title="DIY Projects"
                description="Perfect for makers and hobbyists wanting to build custom monitoring solutions."
                items={["Pet monitoring", "Wildlife cameras", "Garden surveillance"]}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Get Started in 3 Simple Steps
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StepCard
                number="1"
                title="Create Account"
                description="Sign up for free and access your secure camera dashboard instantly."
              />
              <StepCard
                number="2"
                title="Add Your Cameras"
                description="Connect webcams, IP cameras, or any video source with our easy setup wizard."
              />
              <StepCard
                number="3"
                title="Start Monitoring"
                description="View live feeds, receive alerts, and review recordings from anywhere."
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-primary mb-4">
                <HelpCircle className="h-6 w-6" />
                <span className="font-semibold">FAQ</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about Camera Stream
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is Camera Stream really free?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Camera Stream is completely free to use. There are no upfront costs, no monthly subscription fees, and no hidden charges. Simply create an account and start monitoring your cameras right away.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What types of cameras are supported?</AccordionTrigger>
                  <AccordionContent>
                    Camera Stream supports a wide range of cameras including USB webcams, IP cameras with RTSP/MJPEG streams, network cameras, and Raspberry Pi cameras. If your camera can output a video stream, it likely works with Camera Stream.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Where are my recordings stored?</AccordionTrigger>
                  <AccordionContent>
                    Recordings are stored locally on your device by default. You have full control over your footage — nothing is uploaded to the cloud unless you explicitly configure cloud storage integration. This ensures maximum privacy and security.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>How does motion detection work?</AccordionTrigger>
                  <AccordionContent>
                    Camera Stream uses advanced frame comparison algorithms to detect movement in your camera feeds. You can customize the sensitivity, set detection zones, and configure cooldown periods to reduce false alerts. When motion is detected, you'll receive instant email notifications.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Can I access my cameras remotely?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Once your cameras are set up, you can access them from any device with a web browser. The mobile-friendly interface makes it easy to check your cameras from your phone or tablet when you're away from home.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger>Is my data secure and private?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely. Camera Stream is designed with privacy as a core principle. Your video feeds and recordings stay on your local network by default. We don't have access to your camera footage, and your credentials are encrypted. You're always in control of your data.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-7">
                  <AccordionTrigger>How many cameras can I connect?</AccordionTrigger>
                  <AccordionContent>
                    You can connect up to 16 cameras to your dashboard. The multi-camera grid lets you view and manage all your cameras from a single interface, with flexible layout options for different screen sizes.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                  <AccordionTrigger>Do I need technical knowledge to set this up?</AccordionTrigger>
                  <AccordionContent>
                    Not at all! Camera Stream is designed to be user-friendly. Adding a webcam is as simple as clicking "Add Camera" and granting browser permissions. For IP cameras, you just need the camera's stream URL. Our documentation provides step-by-step guides for all setup scenarios.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="text-center mt-10">
              <p className="text-muted-foreground mb-4">Still have questions?</p>
              <Link to="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Secure Your Space?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Join thousands of users who trust Camera Stream for their security monitoring needs.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="font-bold">Camera Stream</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Privacy-focused security camera monitoring system for any camera.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#features" className="hover:text-foreground">Features</a></li>
                  <li><Link to="/auth" className="hover:text-foreground">Get Started</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/documentation" className="hover:text-foreground">Documentation</Link></li>
                  <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
                  <li><a href="mailto:support@camerastream.live" className="hover:text-foreground">Support</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Camera Stream. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card className="border-border/50 hover:border-primary/50 transition-colors">
    <CardContent className="p-6">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const BenefitItem = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 mt-1">{icon}</div>
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

const UseCaseCard = ({ title, description, items }: { title: string; description: string; items: string[] }) => (
  <Card className="border-border/50">
    <CardContent className="p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

const StepCard = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="text-center">
    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default Landing;
