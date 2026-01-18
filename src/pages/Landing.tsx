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
  Eye, Lock, Settings, Monitor, HardDrive, Wifi, HelpCircle, Home, Play, ArrowRight
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";

// FAQ data for schema markup
const faqData = [
  {
    question: "Is Camera Stream really free?",
    answer: "Yes! Camera Stream is completely free to use. There are no upfront costs, no monthly subscription fees, and no hidden charges. Simply create an account and start monitoring your cameras right away."
  },
  {
    question: "What types of cameras are supported?",
    answer: "Camera Stream supports a wide range of cameras including USB webcams, IP cameras with RTSP/MJPEG streams, network cameras, Raspberry Pi cameras, and Home Assistant camera entities. If your camera can output a video stream, it likely works with Camera Stream."
  },
  {
    question: "Where are my recordings stored?",
    answer: "Recordings are stored locally on your device by default. You have full control over your footage — nothing is uploaded to the cloud unless you explicitly configure cloud storage integration. This ensures maximum privacy and security."
  },
  {
    question: "How does motion detection work?",
    answer: "Camera Stream uses advanced frame comparison algorithms to detect movement in your camera feeds. You can customize the sensitivity, set detection zones, and configure cooldown periods to reduce false alerts. When motion is detected, you'll receive instant email notifications."
  },
  {
    question: "Can I access my cameras remotely?",
    answer: "Yes! Once your cameras are set up, you can access them from any device with a web browser. The mobile-friendly interface makes it easy to check your cameras from your phone or tablet when you're away from home."
  },
  {
    question: "Is my data secure and private?",
    answer: "Absolutely. Camera Stream is designed with privacy as a core principle. Your video feeds and recordings stay on your local network by default. We don't have access to your camera footage, and your credentials are encrypted. You're always in control of your data."
  },
  {
    question: "How many cameras can I connect?",
    answer: "You can connect up to 16 cameras to your dashboard. The multi-camera grid lets you view and manage all your cameras from a single interface, with flexible layout options for different screen sizes."
  },
  {
    question: "Do I need technical knowledge to set this up?",
    answer: "Not at all! Camera Stream is designed to be user-friendly. Adding a webcam is as simple as clicking 'Add Camera' and granting browser permissions. For IP cameras, you just need the camera's stream URL. Our documentation provides step-by-step guides for all setup scenarios."
  }
];


const Landing = () => {
  return (
    <>
      <SEOHead 
        title="Camera Stream - Free Security Camera System | Motion Detection & Alerts"
        description="Professional security camera monitoring with real-time motion detection, instant email alerts, and local storage. 100% free, privacy-focused, open-source. Monitor up to 16 cameras."
        keywords="free security camera, home security system, camera motion detection, webcam monitoring, surveillance system, IP camera software, privacy-focused camera, local storage camera, multi-camera dashboard, DIY security"
        canonical="https://www.camerastream.live/"
      />
      <StructuredData 
        type="faq"
        pageTitle="Camera Stream - Free Security Camera Monitoring System"
        pageDescription="Professional security camera monitoring with motion detection and privacy-focused design"
        faqItems={faqData}
      />
      
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-xl animate-glow-pulse" />
              </div>
              <span className="text-lg sm:text-xl font-bold">Camera Stream</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-4 group">
                  Get Started
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative min-h-[90vh] flex items-center">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-float-delayed" />
            <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>

          <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text content */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full mb-6 animate-fade-in-up opacity-0">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">100% Free & Privacy-First</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up opacity-0 animation-delay-100">
                  Your Cameras, One
                  <span className="block mt-2 bg-gradient-to-r from-primary via-blue-400 to-cyan-400 text-gradient">
                    Smart Dashboard
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in-up opacity-0 animation-delay-200">
                  Privacy-focused, open-source camera monitoring with real-time motion detection, 
                  instant email alerts, and local storage. Works with webcams, IP cameras, and more.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up opacity-0 animation-delay-300">
                  <Link to="/auth">
                    <Button size="lg" className="text-lg px-8 group relative overflow-hidden">
                      <span className="relative z-10 flex items-center">
                        Start Monitoring Free
                        <Play className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      </span>
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button size="lg" variant="outline" className="text-lg px-8 glass glass-hover">
                      Learn More
                    </Button>
                  </a>
                </div>
              </div>

              {/* Right: Dashboard mockup */}
              <div className="relative animate-fade-in-up opacity-0 animation-delay-400">
                <div className="relative">
                  {/* Browser frame */}
                  <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/10 overflow-hidden">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-destructive/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <div className="w-3 h-3 rounded-full bg-green-500/60" />
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="bg-background/50 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                          camerastream.live/dashboard
                        </div>
                      </div>
                    </div>
                    
                    {/* Dashboard preview */}
                    <div className="p-4 bg-background/50">
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="aspect-video rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center relative overflow-hidden group">
                            <Camera className="h-8 w-8 text-muted-foreground/50" />
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[10px] text-muted-foreground">Live</span>
                            </div>
                            {i === 1 && (
                              <div className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Bell className="h-2.5 w-2.5" />
                                Motion
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 bg-card border border-border/50 rounded-lg p-3 shadow-lg animate-float hidden md:block">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Secure</p>
                        <p className="text-[10px] text-muted-foreground">Local Storage</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-lg p-3 shadow-lg animate-float-delayed hidden md:block">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">16 Cameras</p>
                        <p className="text-[10px] text-muted-foreground">All Online</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12 animate-fade-in-up opacity-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful Security Features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to secure your home or office with any camera
              </p>
            </div>
            
            {/* Bento grid layout */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Large feature card */}
              <FeatureCard
                icon={<Eye className="h-8 w-8" />}
                title="Real-Time Motion Detection"
                description="Advanced algorithms detect movement instantly with configurable sensitivity zones and thresholds."
                className="lg:col-span-2 animate-fade-in-up opacity-0 animation-delay-100"
                large
              />
              <FeatureCard
                icon={<Bell className="h-8 w-8" />}
                title="Instant Alerts"
                description="Receive immediate notifications when motion is detected."
                className="animate-fade-in-up opacity-0 animation-delay-200"
              />
              <FeatureCard
                icon={<Lock className="h-8 w-8" />}
                title="Privacy-First"
                description="Your data stays on your hardware. No cloud uploads required."
                className="animate-fade-in-up opacity-0 animation-delay-300"
              />
              <FeatureCard
                icon={<HardDrive className="h-8 w-8" />}
                title="Local Storage"
                description="Store recordings directly on your device with full control."
                className="lg:col-span-2 animate-fade-in-up opacity-0 animation-delay-400"
                large
              />
              <FeatureCard
                icon={<Smartphone className="h-8 w-8" />}
                title="Mobile-Friendly"
                description="Monitor from any device with our responsive interface."
                className="animate-fade-in-up opacity-0 animation-delay-500"
              />
              <FeatureCard
                icon={<Wifi className="h-8 w-8" />}
                title="Multi-Camera Support"
                description="Connect webcams, IP cameras, and network cameras in one dashboard."
                className="animate-fade-in-up opacity-0 animation-delay-600"
              />
              <FeatureCard
                icon={<Home className="h-8 w-8" />}
                title="Home Assistant"
                description="Seamless integration with your smart home setup."
                className="animate-fade-in-up opacity-0 animation-delay-100"
              />
            </div>
          </div>
        </section>

        {/* Home Assistant Integration Section */}
        <section className="py-16 md:py-24 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full mb-6">
                  <Home className="h-5 w-5" />
                  <span className="font-semibold">Home Assistant Compatible</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Seamless Home Assistant Integration
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Already using Home Assistant for your smart home? Camera Stream integrates 
                  directly with your HA instance, letting you view all your cameras in one 
                  privacy-focused dashboard.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    { icon: Camera, text: "Stream any Home Assistant camera entity directly" },
                    { icon: Bell, text: "Send motion detection webhooks to trigger HA automations" },
                    { icon: Lock, text: "Secure connection using your HA Long-Lived Access Token" },
                    { icon: Zap, text: "Works with local HA or Nabu Casa cloud access" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <item.icon className="h-3 w-3 text-primary" />
                      </div>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/documentation">
                  <Button variant="outline" size="lg" className="glass glass-hover">
                    View Setup Guide
                  </Button>
                </Link>
              </div>
              <div className="glass rounded-xl p-8 border">
                <h3 className="font-semibold text-lg mb-4">Quick Setup Steps</h3>
                <ol className="space-y-4">
                  {[
                    { title: "Create a Long-Lived Access Token", desc: "In Home Assistant: Profile → Security → Create Token" },
                    { title: "Enter Your HA URL", desc: "Add your Home Assistant URL (local or Nabu Casa)" },
                    { title: "Select Your Cameras", desc: "Choose from your discovered camera entities" },
                    { title: "Optional: Add Webhook Automation", desc: "Create HA automations triggered by motion events" },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
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
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Perfect For Any Security Need
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Whether you're protecting your home, office, or monitoring wildlife, Camera Stream adapts to your needs
              </p>
            </div>
            
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
        <section id="faq" className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="container mx-auto px-4 relative z-10">
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
                {faqData.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
                    <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            <div className="text-center mt-10">
              <p className="text-muted-foreground mb-4">Still have questions?</p>
              <Link to="/contact">
                <Button variant="outline" className="glass glass-hover">Contact Support</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-600" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
              Ready to Secure Your Space?
            </h2>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Join thousands of users who trust Camera Stream for their security monitoring needs.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 group">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-12 bg-background">
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
                  <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                  <li><Link to="/auth" className="hover:text-foreground transition-colors">Get Started</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/documentation" className="hover:text-foreground transition-colors">Documentation</Link></li>
                  <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                  <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
                  <li><a href="mailto:support@camerastream.live" className="hover:text-foreground transition-colors">Support</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} Camera Stream. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  large?: boolean;
}

const FeatureCard = ({ icon, title, description, className = "", large = false }: FeatureCardProps) => (
  <Card className={`glass border transition-all duration-300 hover:scale-[1.02] glass-hover group ${className}`}>
    <CardContent className={`${large ? 'p-8' : 'p-6'}`}>
      <div className="text-primary mb-4 transition-all duration-300 group-hover:scale-110 group-hover:glow-sm">
        {icon}
      </div>
      <h3 className={`${large ? 'text-2xl' : 'text-xl'} font-semibold mb-2`}>{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const BenefitItem = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex gap-4 group">
    <div className="flex-shrink-0 mt-1 transition-transform duration-300 group-hover:scale-110">{icon}</div>
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

const UseCaseCard = ({ title, description, items }: { title: string; description: string; items: string[] }) => (
  <Card className="glass border transition-all duration-300 hover:scale-[1.02] glass-hover">
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
  <div className="text-center group">
    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default Landing;
