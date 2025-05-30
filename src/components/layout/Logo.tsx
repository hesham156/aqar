import { Building2 } from 'lucide-react';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = 'h-8 w-8' }: LogoProps) => {
  return (
    <div className={`text-primary-600 ${className}`}>
      <Building2 className="w-full h-full" />
    </div>
  );
};

export default Logo;