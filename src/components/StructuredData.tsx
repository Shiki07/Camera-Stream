import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  type?: 'page' | 'faq' | 'howto' | 'product';
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: Array<{ question: string; answer: string }>;
  pageTitle?: string;
  pageDescription?: string;
}

const BASE_URL = 'https://www.camerastream.live';

// Route-specific breadcrumbs
const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  '/': [
    { name: 'Home', url: BASE_URL }
  ],
  '/dashboard': [
    { name: 'Home', url: BASE_URL },
    { name: 'Dashboard', url: `${BASE_URL}/dashboard` }
  ],
  '/auth': [
    { name: 'Home', url: BASE_URL },
    { name: 'Sign In', url: `${BASE_URL}/auth` }
  ],
  '/documentation': [
    { name: 'Home', url: BASE_URL },
    { name: 'Documentation', url: `${BASE_URL}/documentation` }
  ],
  '/contact': [
    { name: 'Home', url: BASE_URL },
    { name: 'Contact', url: `${BASE_URL}/contact` }
  ],
  '/privacy': [
    { name: 'Home', url: BASE_URL },
    { name: 'Privacy Policy', url: `${BASE_URL}/privacy` }
  ],
  '/terms': [
    { name: 'Home', url: BASE_URL },
    { name: 'Terms of Service', url: `${BASE_URL}/terms` }
  ],
  '/landing': [
    { name: 'Home', url: BASE_URL },
    { name: 'Features', url: `${BASE_URL}/landing` }
  ]
};

export const StructuredData = ({
  type = 'page',
  breadcrumbs,
  faqItems,
  pageTitle,
  pageDescription
}: StructuredDataProps) => {
  const location = useLocation();
  
  useEffect(() => {
    // Get breadcrumbs for current route
    const currentBreadcrumbs = breadcrumbs || routeBreadcrumbs[location.pathname] || routeBreadcrumbs['/'];
    
    // Create breadcrumb structured data
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": currentBreadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };
    
    // Find or create breadcrumb script tag
    let breadcrumbScript = document.querySelector('script[data-type="breadcrumb-ld"]');
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.setAttribute('type', 'application/ld+json');
      breadcrumbScript.setAttribute('data-type', 'breadcrumb-ld');
      document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
    
    // Add WebPage structured data for the current page
    if (pageTitle && pageDescription) {
      const webPageData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": pageTitle,
        "description": pageDescription,
        "url": `${BASE_URL}${location.pathname}`,
        "isPartOf": {
          "@type": "WebSite",
          "name": "Camera Stream",
          "url": BASE_URL
        },
        "breadcrumb": breadcrumbData
      };
      
      let webPageScript = document.querySelector('script[data-type="webpage-ld"]');
      if (!webPageScript) {
        webPageScript = document.createElement('script');
        webPageScript.setAttribute('type', 'application/ld+json');
        webPageScript.setAttribute('data-type', 'webpage-ld');
        document.head.appendChild(webPageScript);
      }
      webPageScript.textContent = JSON.stringify(webPageData);
    }
    
    // Add FAQ structured data if provided
    if (faqItems && faqItems.length > 0) {
      const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      };
      
      let faqScript = document.querySelector('script[data-type="faq-ld"]');
      if (!faqScript) {
        faqScript = document.createElement('script');
        faqScript.setAttribute('type', 'application/ld+json');
        faqScript.setAttribute('data-type', 'faq-ld');
        document.head.appendChild(faqScript);
      }
      faqScript.textContent = JSON.stringify(faqData);
    }
    
    // Cleanup on unmount
    return () => {
      const breadcrumbEl = document.querySelector('script[data-type="breadcrumb-ld"]');
      const webPageEl = document.querySelector('script[data-type="webpage-ld"]');
      const faqEl = document.querySelector('script[data-type="faq-ld"]');
      
      breadcrumbEl?.remove();
      webPageEl?.remove();
      faqEl?.remove();
    };
  }, [location.pathname, breadcrumbs, faqItems, pageTitle, pageDescription]);
  
  return null;
};

// HowTo structured data for documentation/guides
export const HowToStructuredData = ({
  name,
  description,
  steps
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
}) => {
  useEffect(() => {
    const howToData = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": name,
      "description": description,
      "step": steps.map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": step.name,
        "text": step.text,
        ...(step.image && { "image": step.image })
      }))
    };
    
    let howToScript = document.querySelector('script[data-type="howto-ld"]');
    if (!howToScript) {
      howToScript = document.createElement('script');
      howToScript.setAttribute('type', 'application/ld+json');
      howToScript.setAttribute('data-type', 'howto-ld');
      document.head.appendChild(howToScript);
    }
    howToScript.textContent = JSON.stringify(howToData);
    
    return () => {
      document.querySelector('script[data-type="howto-ld"]')?.remove();
    };
  }, [name, description, steps]);
  
  return null;
};
