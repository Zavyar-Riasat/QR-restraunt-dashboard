import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Mobile-First Sticky Bottom Navigation Bar
 * - Mobile-first at 360px viewport
 * - Strictly thumb-friendly 48px touch targets
 * - 5 items: Home, Search, Favorites, Orders, Account
 * - Dark-mode and RTL support
 */
export default function CustomerBottomNav({ onSearchClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, favorites, isCustomerAuthenticated } = useCustomerAuth();
  const { t } = useLanguage();

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  const isHomePage = location.pathname === '/';
  const isAccountPage = location.pathname === '/account';

  const handleSearchPress = (e) => {
    if (onSearchClick) {
      e.preventDefault();
      onSearchClick();
    } else if (!isHomePage) {
      navigate('/?focus=search');
    } else {
      const searchInput = document.getElementById('marketplace-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const navItems = [
    {
      id: 'home',
      label: t('home'),
      to: '/',
      icon: Home,
      isActive: isHomePage && !location.search.includes('focus=search'),
    },
    {
      id: 'search',
      label: t('search'),
      to: '/?focus=search',
      icon: Search,
      onClick: handleSearchPress,
      isActive: isHomePage && location.search.includes('focus=search'),
    },
    {
      id: 'favorites',
      label: t('favorites'),
      to: isCustomerAuthenticated ? '/account?tab=favorites' : '/account',
      icon: Heart,
      badge: favorites?.length > 0 ? favorites.length : null,
      isActive: isAccountPage && currentTab === 'favorites',
    },
    {
      id: 'orders',
      label: t('orders'),
      to: isCustomerAuthenticated ? '/account?tab=orders' : '/account',
      icon: ShoppingBag,
      isActive: isAccountPage && (!currentTab || currentTab === 'orders'),
    },
    {
      id: 'account',
      label: isCustomerAuthenticated && customer?.name ? customer.name.split(' ')[0] : t('account'),
      to: '/account',
      icon: User,
      isActive: isAccountPage && currentTab === 'profile',
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#1E1611]/95 backdrop-blur-md border-t border-[#F0E4D7] dark:border-[#382B20] shadow-[0_-4px_20px_rgba(43,33,24,0.06)] px-2 pt-1 pb-[max(env(safe-area-inset-bottom,0px),0.35rem)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <NavLink
              key={item.id}
              to={item.to}
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[48px] py-1 px-1 rounded-xl transition-all duration-200 select-none group cursor-pointer ${
                active
                  ? 'text-[#F26B1D] font-bold'
                  : 'text-[#7A6A5C] dark:text-[#A8988B] hover:text-[#2B2118] dark:hover:text-[#FFF9F2]'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    active ? 'stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#F26B1D] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[10px] mt-0.5 tracking-tight leading-none truncate max-w-[64px]">
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {active && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#F26B1D]" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
