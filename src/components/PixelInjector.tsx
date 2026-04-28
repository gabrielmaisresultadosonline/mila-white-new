import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminData } from '@/lib/adminConfig';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

const PixelInjector = () => {
  const location = useLocation();

  useEffect(() => {
    const adminData = getAdminData();
    const pixelCode = adminData.settings.facebookPixel;

    if (!pixelCode) return;

    const isOnlyId = /^[0-9]+$/.test(pixelCode.trim());

    if (isOnlyId) {
      const id = pixelCode.trim();
      
      // Initialize if not already done
      if (!window.fbq) {
        const script = document.createElement('script');
        script.id = 'fb-pixel-script';
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${id}');
        `;
        document.head.appendChild(script);

        const noscript = document.createElement('noscript');
        noscript.id = 'fb-pixel-noscript';
        noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1" />`;
        document.body.appendChild(noscript);
      }

      // Track PageView on every route change
      if (window.fbq) {
        window.fbq('track', 'PageView');
      }
    } else {
      // For full script injection, we only do it once
      if (!document.getElementById('fb-pixel-script-full')) {
        const div = document.createElement('div');
        div.id = 'fb-pixel-script-full';
        div.innerHTML = pixelCode;
        
        const scripts = div.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const newScript = document.createElement('script');
          newScript.innerHTML = scripts[i].innerHTML;
          document.head.appendChild(newScript);
        }
        
        const nonScripts = Array.from(div.childNodes).filter(node => node.nodeName !== 'SCRIPT');
        nonScripts.forEach(node => {
          document.body.appendChild(node.cloneNode(true));
        });
      }
      
      // Try to call fbq track if available
      if (window.fbq) {
        window.fbq('track', 'PageView');
      }
    }
  }, [location.pathname]);

  return null;
};

export default PixelInjector;
