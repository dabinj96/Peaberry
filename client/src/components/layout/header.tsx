import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Heart, Coffee, Menu, Search, User, LogOut, ChevronDown, Settings } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo - Left Side */}
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#A0522D] rounded-full flex items-center justify-center">
                <Coffee className="text-white" />
              </div>
              <span className="font-serif font-bold text-2xl text-[#8B4513]">Peaberry</span>
            </Link>
          </div>
          
          {/* Desktop Navigation - Center */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-[#A0522D] transition font-medium">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-[#A0522D] transition font-medium">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-[#A0522D] transition font-medium">
                Contact
              </Link>
            </div>
          </div>
          
          {/* User Profile/Actions - Right Side */}
          <div className="flex flex-1 items-center space-x-4 justify-end">
            {/* Search button (mobile) */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>
            
            {/* User sections */}
            {user ? (
              // Logged in view
              <div className="flex items-center gap-2">
                {/* Favorites button */}
                <Link href="/profile?tab=favorites">
                  <Button variant="ghost" size="icon" className="relative">
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                
                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline-block">{user.name.split(' ')[0]}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile?tab=favorites")}>
                      <Heart className="mr-2 h-4 w-4" />
                      My Favorites
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              // Not logged in view
              <div className="hidden md:block">
                <Link href="/auth" onClick={(e) => {
                  // If already on the auth page, just update the URL and handle the tab change
                  if (window.location.pathname === '/auth') {
                    e.preventDefault();
                    window.history.replaceState(null, '', '/auth');
                    // Dispatch a custom event that the auth page can listen for
                    window.dispatchEvent(new CustomEvent('tabChange', { detail: 'login' }));
                  }
                }}>
                  <Button variant="outline" className="mr-2">Login</Button>
                </Link>
                <Link href="/auth?tab=register" onClick={(e) => {
                  // If already on the auth page, just update the URL and handle the tab change
                  if (window.location.pathname === '/auth') {
                    e.preventDefault();
                    window.history.replaceState(null, '', '/auth?tab=register');
                    // Dispatch a custom event that the auth page can listen for
                    window.dispatchEvent(new CustomEvent('tabChange', { detail: 'register' }));
                  }
                }}>
                  <Button className="bg-[#A0522D] hover:bg-[#8B4513]">Create Account</Button>
                </Link>
              </div>
            )}
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile search bar */}
      {isSearchOpen && (
        <div className="md:hidden px-4 py-3 bg-white border-t">
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for cafés, neighborhoods..."
              className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#A0522D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Button
              type="submit"
              className="absolute right-1 top-1 rounded-full py-1 px-3 bg-[#A0522D] hover:bg-[#8B4513] text-white"
            >
              Search
            </Button>
          </form>
        </div>
      )}
      
      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-inner">
          <div className="px-4 py-3 space-y-2">
            <Link href="/" className="block py-2 text-gray-700 hover:text-[#A0522D]">
              Home
            </Link>
            <Link href="/about" className="block py-2 text-gray-700 hover:text-[#A0522D]">
              About
            </Link>
            <Link href="/contact" className="block py-2 text-gray-700 hover:text-[#A0522D]">
              Contact
            </Link>
            
            {user ? (
              <div className="py-2 border-t mt-2 pt-2">
                <Link href="/profile">
                  <Button variant="outline" className="w-full mb-2 justify-start">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="outline" className="w-full mb-2 justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                <Button 
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 justify-start" 
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="py-2 border-t mt-2 pt-2">
                <Link href="/auth" onClick={(e) => {
                  // If already on the auth page, just update the URL and handle the tab change
                  if (window.location.pathname === '/auth') {
                    e.preventDefault();
                    window.history.replaceState(null, '', '/auth');
                    // Dispatch a custom event that the auth page can listen for
                    window.dispatchEvent(new CustomEvent('tabChange', { detail: 'login' }));
                  }
                }}>
                  <Button variant="outline" className="mr-2 w-full mb-2">Login</Button>
                </Link>
                <Link href="/auth?tab=register" onClick={(e) => {
                  // If already on the auth page, just update the URL and handle the tab change
                  if (window.location.pathname === '/auth') {
                    e.preventDefault();
                    window.history.replaceState(null, '', '/auth?tab=register');
                    // Dispatch a custom event that the auth page can listen for
                    window.dispatchEvent(new CustomEvent('tabChange', { detail: 'register' }));
                  }
                }}>
                  <Button className="bg-[#A0522D] hover:bg-[#8B4513] w-full">Create Account</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
