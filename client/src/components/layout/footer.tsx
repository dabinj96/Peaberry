import { Link } from "wouter";
import { Coffee, Instagram, Twitter, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#8B4513] text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Coffee className="text-[#8B4513]" />
              </div>
              <span className="font-serif font-bold text-2xl">Peaberry</span>
            </Link>
            <p className="text-gray-300 mb-4">Discover Boston's specialty coffee scene, one cup at a time.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition">
                <Instagram />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition">
                <Twitter />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition">
                <Facebook />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Neighborhoods
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Featured Cafés
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Brewing Methods
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Roast Profiles
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Coffee Events
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/about#team" className="text-gray-300 hover:text-white transition">
                  Team
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-300 hover:text-white transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/press" className="text-gray-300 hover:text-white transition">
                  Press
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-4">Newsletter</h3>
            <p className="text-gray-300 mb-4">Subscribe to get updates on new cafés and coffee events in Boston.</p>
            <form className="mb-4">
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="px-3 py-2 bg-[#8B4513] border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#FF8C00] text-white flex-grow"
                />
                <button 
                  type="submit" 
                  className="bg-[#FF8C00] hover:bg-[#FFB347] text-white px-3 py-2 rounded-r-md transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Peaberry. All rights reserved.
          </div>
          <div className="flex space-x-4 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-white transition">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
