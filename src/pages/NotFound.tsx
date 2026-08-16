import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEOHead
        title="Page Not Found — Camera Stream Security Monitoring"
        description="This Camera Stream page could not be found. Return to the homepage to explore free, privacy-focused security camera monitoring."
        keywords="camera stream, page not found, 404"
        canonical="https://www.camerastream.live/"
        noindex
      />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            404 — Page Not Found
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            The page you are looking for does not exist.
          </p>
          <a href="/" className="text-primary hover:underline underline-offset-4">
            Return to Home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
