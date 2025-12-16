import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  jsonLd?: object;
}

const defaultJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Camera Stream",
  "applicationCategory": "SecurityApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Privacy-focused security camera monitoring system with real-time motion detection, instant email alerts, and local storage. Free and open-source.",
  "featureList": [
    "Real-time motion detection",
    "Instant email alerts",
    "Local storage recording",
    "Multi-camera support (up to 16 cameras)",
    "Privacy-first design",
    "Mobile-friendly interface"
  ],
  "screenshot": "https://www.camerastream.live/og-image.jpg",
  "softwareVersion": "1.0",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "150"
  }
};

export const SEOHead = ({ 
  title = "Camera Stream - Smart Security Camera Monitoring System",
  description = "Professional camera monitoring system with motion detection, real-time alerts, and privacy-focused security.",
  keywords = "security camera, camera monitoring, home security system, motion detection, webcam monitoring, IP camera",
  canonical = "https://www.camerastream.live/",
  jsonLd
}: SEOHeadProps) => {
  useEffect(() => {
    // Update title
    document.title = title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords);
    }
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);
    
    // Update Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonical);
    }

    // Add JSON-LD structured data
    const structuredData = jsonLd || defaultJsonLd;
    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Cleanup function to remove JSON-LD when component unmounts
    return () => {
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [title, description, keywords, canonical, jsonLd]);

  return null;
};