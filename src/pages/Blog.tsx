import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { StructuredData } from "@/components/StructuredData";
import { Camera, ArrowLeft, Calendar, Clock, ArrowRight, Shield, Eye, Home } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  icon: React.ReactNode;
}

const blogPosts: BlogPost[] = [
  {
    slug: "free-home-security-camera-setup",
    title: "Free Home Security Camera Setup Guide",
    description: "Learn how to set up a complete home security camera system using your existing webcam or affordable IP cameras. No monthly fees required.",
    date: "2024-12-15",
    readTime: "8 min read",
    category: "Setup Guide",
    icon: <Home className="h-5 w-5" />
  },
  {
    slug: "privacy-first-camera-monitoring",
    title: "Privacy-First Camera Monitoring Explained",
    description: "Understand why local storage and privacy-focused design matter for home security, and how Camera Stream protects your data.",
    date: "2024-12-10",
    readTime: "6 min read",
    category: "Privacy",
    icon: <Shield className="h-5 w-5" />
  },
  {
    slug: "webcam-vs-ip-camera",
    title: "Webcam vs IP Camera: Which is Right for You?",
    description: "Compare the pros and cons of using a webcam versus a dedicated IP camera for your security monitoring needs.",
    date: "2024-12-05",
    readTime: "5 min read",
    category: "Comparison",
    icon: <Eye className="h-5 w-5" />
  }
];

const Blog = () => {
  return (
    <>
      <SEOHead 
        title="Blog - Camera Stream | Security Camera Tips & Guides"
        description="Expert guides on home security camera setup, privacy-focused monitoring, motion detection tips, and DIY surveillance solutions. Learn from Camera Stream experts."
        keywords="security camera blog, home security tips, camera setup guide, motion detection tutorial, privacy camera monitoring, DIY surveillance"
        canonical="https://www.camerastream.live/blog"
      />
      <StructuredData 
        type="page"
        pageTitle="Camera Stream Blog"
        pageDescription="Expert guides and tutorials for security camera monitoring"
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Camera Stream</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/documentation">
                <Button variant="ghost" size="sm">Documentation</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <header className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Camera Stream Blog</h1>
            <p className="text-muted-foreground text-lg">
              Expert guides, tutorials, and tips for setting up and optimizing your security camera system.
            </p>
          </header>

          <div className="grid gap-6">
            {blogPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                        {post.icon}
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {post.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1 group">
                      Read more
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* CTA Section */}
          <section className="mt-16 text-center p-8 bg-muted/50 rounded-xl border border-border">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Set up your free security camera system in minutes.
            </p>
            <Link to="/auth">
              <Button size="lg">Start Monitoring Free</Button>
            </Link>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <Link to="/documentation" className="hover:text-foreground">Documentation</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link to="/contact" className="hover:text-foreground">Contact</Link>
            </div>
            <p>© {new Date().getFullYear()} Camera Stream. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Blog;
