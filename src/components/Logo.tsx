import logoCodigoInstaShop from '@/assets/logo-codigoinstashop.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-24',
};

export const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  return (
    <img 
      src={logoCodigoInstaShop} 
      alt="Código InstaShop" 
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
};
