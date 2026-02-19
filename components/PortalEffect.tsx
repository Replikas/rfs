'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PortalEffect() {
  const [isSwallowing, setIsSwallowing] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.href.startsWith(window.location.origin) && !link.target) {
        // Only trigger for internal links
        setIsSwallowing(true);
        // We don't prevent default because we want Next.js to navigate, 
        // the overlay will just stay there until the next page loads.
        setTimeout(() => setIsSwallowing(false), 800);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Also trigger when pathname changes (page loaded)
  useEffect(() => {
    setIsSwallowing(false);
  }, [pathname]);

  return (
    <div className={`portal-swallow ${isSwallowing ? 'active' : ''}`} />
  );
}
