"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid, CreditCard, Bell } from "lucide-react";
import { AppRoutes } from "@/constants/appRoutes";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/Logo.png"
              alt="TT Showcase"
              width={180}
              height={60}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href={AppRoutes.LOGIN}
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              href={AppRoutes.REGISTER}
              className="bg-[#7C3AED] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
            >
              Apply
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text and CTAs */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Welcome to TecTerminal Student Portal 
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Your educational portal for everything TecTerminal. Manage your registration, payments, and course schedules in one secure, centralized portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href={AppRoutes.REGISTER}
                className="bg-[#7C3AED] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6D28D9] transition-colors text-center"
              >
                Start your Application
              </Link>
              <Link
                href={AppRoutes.LOGIN}
                className="text-gray-700 hover:text-gray-900 font-medium px-8 py-3.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-center flex items-center justify-center gap-2"
              >
                Log in to portal
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Social Proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white"></div>
                <div className="w-10 h-10 rounded-full bg-gray-400 border-2 border-white"></div>
                <div className="w-10 h-10 rounded-full bg-gray-500 border-2 border-white"></div>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">1,200+</span> students registered this month
              </p>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden">
              <Image
                src="/images/landing-page.png"
                alt="Student working on laptop"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Designed for Your Success Section */}
      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Designed for Your Success
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your application and learning journey in one modern interface.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: Modular Onboarding */}
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <LayoutGrid className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Modular Onboarding
              </h3>
              <p className="text-gray-600">
                Life happens. Stop your application at any stage and pick up exactly where you left off later.
              </p>
            </div>

            {/* Feature 2: Dynamic Flex-Pay */}
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Dynamic Flex-Pay
              </h3>
              <p className="text-gray-600">
                Control your finances. Choose your initial deposit and spread the rest across custom monthly installments.
              </p>
            </div>

            {/* Feature 3: Instant Verification */}
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Instant Verification
              </h3>
              <p className="text-gray-600">
                Get real-time feedback on your payments and course status with our fully integrated notification system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Steps to Enrolment Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12">
            THREE STEPS TO ENROLMENT
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 max-w-5xl mx-auto relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-gray-300 z-0"></div>
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4 bg-white">
                <span className="text-2xl font-semibold text-gray-700">01</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create Account
              </h3>
              <p className="text-gray-600">
                Sign up with just your name and email.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4 bg-white">
                <span className="text-2xl font-semibold text-gray-700">02</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pick Your Path
              </h3>
              <p className="text-gray-600">
                Select from our 6-month specialized courses.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4 bg-white">
                <span className="text-2xl font-semibold text-gray-700">03</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Secure Your Seat
              </h3>
              <p className="text-gray-600">
                Pay your base fee and start learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to start? CTA Section */}
      <section className="bg-[#7C3AED] py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
            Join the next cohort of world-class Digital Learners. No complicated forms, no hidden fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={AppRoutes.REGISTER}
              className="bg-white text-[#7C3AED] px-8 py-3.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Start your Application
            </Link>
            <Link
              href={AppRoutes.LOGIN}
              className="text-white hover:text-purple-100 font-medium px-8 py-3.5 rounded-lg border border-white/30 hover:border-white/50 transition-colors flex items-center justify-center gap-2"
            >
              Log in to portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            © 2026 TT SHOWCASE STUDENT PORTAL • POWERED BY TECTERMINAL
          </p>
        </div>
      </footer>
    </div>
  );
}
