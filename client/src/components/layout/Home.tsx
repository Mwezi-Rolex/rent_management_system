import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, HomeIcon, CurrencyDollarIcon, WrenchIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

const Home: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 to-white"></div>
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <h1 className="mt-10 max-w-lg text-4xl font-display font-bold tracking-tight text-neutral-900 sm:text-6xl">
              Property Management <span className="text-primary-600">Simplified</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-600">
              A comprehensive platform for property owners and tenants to manage
              rentals, payments, and maintenance requests all in one place.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link to="/register">
                <Button variant="default" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link
                to="/login"
                className="flex items-center text-base font-semibold leading-6 text-neutral-900 hover:text-primary-600 transition-all duration-200"
              >
                Log in <ArrowRightIcon className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
            <div className="relative mx-auto h-80 w-80 sm:h-96 sm:w-96 lg:h-[30rem] lg:w-[30rem]">
              <img
                className="absolute top-0 left-0 max-h-full max-w-full rounded-2xl shadow-xl ring-1 ring-neutral-900/10"
                src="/images/hero-image.svg"
                alt="Property Management Dashboard"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Streamlined Management</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl font-display">
              Everything you need to manage your properties
            </p>
            <p className="mt-6 text-lg leading-8 text-neutral-600">
              RentEase provides powerful tools for both property owners and tenants, making rental management simpler and more efficient.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-neutral-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary-600">
                    <HomeIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Property Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-neutral-600">
                  <p className="flex-auto">
                    Easily manage multiple properties, track occupancy, and handle lease agreements in one place.
                  </p>
                  <p className="mt-6">
                    <Link to="/register" className="text-sm font-semibold leading-6 text-primary-600">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-neutral-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary-600">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Rent Collection
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-neutral-600">
                  <p className="flex-auto">
                    Automated invoicing, M-Pesa integration, and payment tracking to streamline rent collection.
                  </p>
                  <p className="mt-6">
                    <Link to="/register" className="text-sm font-semibold leading-6 text-primary-600">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-neutral-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary-600">
                    <WrenchIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Maintenance Requests
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-neutral-600">
                  <p className="flex-auto">
                    Simple system for tenants to report issues and landlords to track and resolve maintenance requests.
                  </p>
                  <p className="mt-6">
                    <Link to="/register" className="text-sm font-semibold leading-6 text-primary-600">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-neutral-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl font-display">How It Works</h2>
            <p className="mt-6 text-lg leading-8 text-neutral-600">
              Get started with RentEase in just a few simple steps
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-y-16 gap-x-8 text-center lg:grid-cols-4">
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold leading-7 tracking-tight text-neutral-900">Sign Up</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">Create an account as a tenant or landlord</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold leading-7 tracking-tight text-neutral-900">Add Properties</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">Landlords add properties and assign tenants</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold leading-7 tracking-tight text-neutral-900">Manage Payments</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">Generate invoices and process payments</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                  <span className="text-2xl font-bold">4</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold leading-7 tracking-tight text-neutral-900">Track Maintenance</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">Handle maintenance requests efficiently</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-700">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-display">
              Ready to streamline your rental management?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-200">
              Join thousands of landlords and tenants who are saving time and reducing stress.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/register">
                <Button variant="secondary" size="lg">
                  Get Started Now
                </Button>
              </Link>
              <Link
                to="/login"
                className="text-base font-semibold leading-6 text-white hover:text-primary-100 transition-all duration-200"
              >
                Log in <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 