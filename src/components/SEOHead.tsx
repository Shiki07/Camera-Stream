import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  jsonLd?: object;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
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
  jsonLd,
  ogImage = "https://www.camerastream.live/og-image.jpg",
  ogType = "website",
  noindex = false
}: SEOHeadProps) => {
  useEffect(() => {
    // Update title
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);
    
    // Update robots meta tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);
    
    // Update Open Graph meta tags
    const updateOrCreateMeta = (property: string, content: string, isProperty = true) => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(isProperty ? 'property' : 'name', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    // Open Graph tags
    updateOrCreateMeta('og:title', title);
    updateOrCreateMeta('og:description', description);
    updateOrCreateMeta('og:url', canonical);
    updateOrCreateMeta('og:image', ogImage);
    updateOrCreateMeta('og:type', ogType);
    updateOrCreateMeta('og:site_name', 'Camera Stream');
    updateOrCreateMeta('og:locale', 'en_US');
    
    // Twitter Card tags
    updateOrCreateMeta('twitter:card', 'summary_large_image', false);
    updateOrCreateMeta('twitter:title', title, false);
    updateOrCreateMeta('twitter:description', description, false);
    updateOrCreateMeta('twitter:image', ogImage, false);
    updateOrCreateMeta('twitter:url', canonical, false);

    // Add JSON-LD structured data
    const structuredData = jsonLd || defaultJsonLd;
    let scriptTag = document.querySelector('script[type="application/ld+json"]:not([data-type])');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Cleanup function to remove JSON-LD when component unmounts
    return () => {
      const existingScript = document.querySelector('script[type="application/ld+json"]:not([data-type])');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [title, description, keywords, canonical, jsonLd, ogImage, ogType, noindex]);

  return null;
};