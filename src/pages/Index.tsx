
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import InvestmentSection from "@/components/InvestmentSection";
import Footer from "@/components/Footer";
import AboutFounder from "@/components/AboutFounder";
import BusinessModel from "@/components/BusinessModel";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Navbar */}
        <nav className="flex justify-between items-center py-4 mb-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Tapit</h1>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</a>
            <a href="#business-model" className="text-sm font-medium text-gray-600 hover:text-gray-900">Business Model</a>
            <a href="#invest" className="text-sm font-medium text-gray-600 hover:text-gray-900">Invest</a>
            <a href="#about" className="text-sm font-medium text-gray-600 hover:text-gray-900">About</a>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              Contact Us
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link to="/reader">
                Document Reader
              </Link>
            </Button>
          </div>
        </nav>

        {/* Main content */}
        <main>
          <HeroSection />
          <FeatureSection />
          <BusinessModel />
          <InvestmentSection />
          <AboutFounder />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
