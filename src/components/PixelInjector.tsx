import { useEffect } from 'react';
import { getAdminData } from '@/lib/adminConfig';

const PixelInjector = () => {
  useEffect(() => {
    const adminData = getAdminData();
    const pixelCode = adminData.settings.facebookPixel;

    if (!pixelCode) return;

    // Remove any existing pixel script to avoid duplication
    const existingScript = document.getElementById('fb-pixel-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Try to extract ID if it's just an ID, otherwise treat as full script
    const isOnlyId = /^[0-9]+$/.test(pixelCode.trim());

    if (isOnlyId) {
      const id = pixelCode.trim();
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
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement('noscript');
      noscript.id = 'fb-pixel-noscript';
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1" />`;
      document.body.appendChild(noscript);
    } else {
      // It's a full script
      const div = document.createElement('div');
      div.id = 'fb-pixel-script';
      div.innerHTML = pixelCode;
      
      // Execute scripts within the div
      const scripts = div.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const newScript = document.createElement('script');
        newScript.innerHTML = scripts[i].innerHTML;
        document.head.appendChild(newScript);
      }
      
      // Add non-script parts (like noscript)
      const nonScripts = Array.from(div.childNodes).filter(node => node.nodeName !== 'SCRIPT');
      nonScripts.forEach(node => {
        document.body.appendChild(node.cloneNode(true));
      });
    }
  }, []);

  return null;
};

export default PixelInjector;
