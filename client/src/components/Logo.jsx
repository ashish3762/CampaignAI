export const Logo = ({ size = 'default' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-8 w-8',
    large: 'h-10 w-10',
  };

  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.svg"
        alt="CampaignAI Logo"
        className={sizeClasses[size]}
      />
      {size !== 'small' && (
        <span className="font-bold text-neutral-900 text-lg">CampaignAI</span>
      )}
    </div>
  );
};
