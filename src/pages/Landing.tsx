import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, Shield, Bell, Smartphone, Cloud, Zap, 
  Eye, Lock, Settings, Monitor, HardDrive, Wifi 
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const Landing = () => {
  return (
    <>
      <SEOHead 
        title="RPi CamAlert - Raspberry Pi Security Camera System | Motion Detection & Alerts"
        description="Transform your Raspberry Pi into a powerful security camera system. Real-time motion detection, instant email alerts, local storage, and privacy-focused monitoring. Free and open-source."
        keywords="raspberry pi security camera, pi camera motion detection, home security system, DIY security camera, raspberry pi surveillance, motion alerts, privacy camera, local storage camera, open source security"
        canonical="https://www.rpicamalert.xyz/"
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">RPi CamAlert</span>
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
            Turn Your Raspberry Pi Into a
            <span className="text-primary block mt-2">Smart Security Camera</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Privacy-focused, open-source security monitoring with real-time motion detection, 
            instant email alerts, and local storage. No cloud subscriptions required.
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
              Everything you need to secure your home or office with your Raspberry Pi camera
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
                description="Store recordings directly on your Raspberry Pi. Full control over your security footage."
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
                title="DuckDNS Integration"
                description="Access your cameras remotely with free dynamic DNS. Easy setup, secure connection."
              />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose RPi CamAlert?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <BenefitItem
                icon={<Shield className="h-6 w-6 text-primary" />}
                title="Complete Privacy Control"
                description="Unlike cloud-based cameras, your footage never leaves your network unless you choose to share it."
              />
              <BenefitItem
                icon={<Zap className="h-6 w-6 text-primary" />}
                title="No Monthly Fees"
                description="One-time setup with no recurring subscription costs. Use your existing Raspberry Pi hardware."
              />
              <BenefitItem
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Fully Customizable"
                description="Adjust motion sensitivity, detection zones, recording schedules, and alert preferences."
              />
              <BenefitItem
                icon={<Monitor className="h-6 w-6 text-primary" />}
                title="Multi-Camera Support"
                description="Monitor multiple Raspberry Pi cameras from a single dashboard interface."
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
              Whether you're protecting your home, office, or monitoring wildlife, RPi CamAlert adapts to your needs
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
                title="Set Up Your Pi"
                description="Install the camera module and run our simple setup script on your Raspberry Pi."
              />
              <StepCard
                number="2"
                title="Connect & Configure"
                description="Add your camera to RPi CamAlert and customize motion detection settings."
              />
              <StepCard
                number="3"
                title="Start Monitoring"
                description="View live feeds, receive alerts, and review recordings from anywhere."
              />
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
              Join thousands of users who trust RPi CamAlert for their security monitoring needs.
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
                  <span className="font-bold">RPi CamAlert</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Privacy-focused Raspberry Pi security camera monitoring system.
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
                  <li><a href="https://github.com" className="hover:text-foreground">Documentation</a></li>
                  <li><a href="mailto:support@camerastream.live" className="hover:text-foreground">Support</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} RPi CamAlert. All rights reserved.</p>
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
