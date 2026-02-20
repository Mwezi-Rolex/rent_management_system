import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/auth-context';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, HomeIcon, BuildingOfficeIcon, UserIcon, DocumentTextIcon, WrenchIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items based on user role
  const navigation = [
    { name: 'Home', href: '/', current: false, icon: HomeIcon, roles: ['guest'] },
    { name: 'Dashboard', href: user?.role === 'tenant' ? '/tenant' : user?.role === 'landlord' ? '/landlord' : '/admin', current: false, icon: HomeIcon, roles: ['tenant', 'landlord', 'admin'] },
    { name: 'Properties', href: user?.role === 'tenant' ? '/tenant/properties' : '/landlord/properties', current: false, icon: BuildingOfficeIcon, roles: ['tenant', 'landlord'] },
    { name: 'Applications', href: user?.role === 'tenant' ? '/tenant/applications' : '/landlord/applications', current: false, icon: DocumentTextIcon, roles: ['tenant', 'landlord'] },
    { name: 'Maintenance', href: user?.role === 'tenant' ? '/tenant/maintenance' : '/landlord/maintenance', current: false, icon: WrenchIcon, roles: ['tenant', 'landlord'] },
    { name: 'Payments', href: '/tenant/payments', current: false, icon: CurrencyDollarIcon, roles: ['tenant'] },
  ];

  // Filter navigation items based on user role
  const filteredNavigation = isAuthenticated 
    ? navigation.filter(item => item.roles.includes(user?.role || '')) 
    : navigation.filter(item => item.roles.includes('guest'));

  return (
    <Disclosure as="nav" className="bg-primary-700 shadow-md">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="text-white font-display text-xl font-bold">RentEase</Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {filteredNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white hover:text-primary-200 transition-colors duration-200"
                    >
                      <item.icon className="h-5 w-5 mr-1" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {isAuthenticated ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-neutral-800 py-1 shadow-lg ring-1 ring-accent-200 dark:ring-neutral-700 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <div className="px-4 py-2 text-sm text-text-700 dark:text-neutral-200 border-b border-accent-200 dark:border-neutral-700">
                              <p className="font-medium">{user?.name}</p>
                              <p className="text-text-500 dark:text-neutral-400">{user?.email}</p>
                            </div>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile"
                              className={`${
                                active ? 'bg-accent-100 dark:bg-neutral-700' : ''
                              } block px-4 py-2 text-sm text-text-700 dark:text-neutral-200`}
                            >
                              My Profile
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile/edit"
                              className={`${
                                active ? 'bg-accent-100 dark:bg-neutral-700' : ''
                              } block px-4 py-2 text-sm text-text-700 dark:text-neutral-200`}
                            >
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-red-100 dark:bg-red-900/20' : ''
                              } block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/login"
                      className="text-white hover:text-primary-200 px-3 py-2 text-sm font-medium transition-colors duration-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-white text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {filteredNavigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  to={item.href}
                  className="flex items-center text-white hover:bg-primary-600 block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200"
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            {isAuthenticated ? (
              <div className="border-t border-primary-600 pb-3 pt-4">
                <div className="flex items-center px-5">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-semibold text-lg">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">{user?.name}</div>
                    <div className="text-sm font-medium text-primary-200">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  <Disclosure.Button
                    as={Link}
                    to="/profile"
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-600 transition-colors duration-200"
                  >
                    My Profile
                  </Disclosure.Button>
                  <Disclosure.Button
                    as={Link}
                    to="/profile/edit"
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-600 transition-colors duration-200"
                  >
                    Settings
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={handleLogout}
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-600 w-full text-left transition-colors duration-200"
                  >
                    Sign out
                  </Disclosure.Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-primary-600 pb-3 pt-4 px-5 flex flex-col space-y-3">
                <Link
                  to="/login"
                  className="block text-center w-full rounded-md bg-primary-600 px-3 py-2 text-base font-medium text-white hover:bg-primary-500 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block text-center w-full rounded-md bg-white px-3 py-2 text-base font-medium text-primary-700 hover:bg-primary-50 transition-colors duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Header; 