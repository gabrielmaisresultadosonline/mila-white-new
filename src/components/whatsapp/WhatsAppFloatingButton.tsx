import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppFloatingButton = () => {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("Olá, gostaria de saber mais sobre o Código InstaShop");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("whatsapp_page_settings")
          .select("whatsapp_number, whatsapp_message")
          .limit(1)
          .single();

        if (data && !error) {
          setWhatsappNumber(data.whatsapp_number || "");
          if (data.whatsapp_message) {
            setWhatsappMessage(data.whatsapp_message);
          }
        }
      } catch (err) {
        console.error("Error loading WhatsApp settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleClick = () => {
    const phone = whatsappNumber.replace(/\D/g, "");
    if (!phone) return;
    const msg = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (!whatsappNumber) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[60] w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 group"
      aria-label="Contato via WhatsApp"
    >
      <div className="absolute -inset-2 bg-[#25D366] rounded-full opacity-20 animate-ping group-hover:animate-none"></div>
      <MessageCircle className="w-8 h-8 text-white fill-white" />
    </button>
  );
};

export default WhatsAppFloatingButton;
