import { useState, useEffect } from 'react';
import { AppBar, Toolbar, Button, IconButton, Drawer, Box, useScrollTrigger } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

const PortfolioHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  useEffect(() => {
    setScrolled(trigger);
  }, [trigger]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { label: 'Beranda', href: '#home' },
    { label: 'Tentang', href: '#about' },
    { label: 'Proyek', href: '#projects' },
    { label: 'Keahlian', href: '#skills' },
    { label: 'Kontak', href: '#contact' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        className={`transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg text-gray-900'
            : 'bg-transparent shadow-none text-white'
        }`}
        elevation={0}
      >
        <Toolbar className="max-w-7xl mx-auto w-full justify-between px-4 md:px-8">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Portfolio
          </div>
          
          {/* Desktop Navigation */}
          <Box className="hidden md:flex gap-4">
            {navItems.map((item) => (
              <Button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className={`${
                  scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                } font-medium transition-colors`}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={handleDrawerToggle}
            className="md:hidden"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        className="md:hidden"
      >
        <Box className="w-64 p-4">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Portfolio
            </div>
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
          </div>
          <Box className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-gray-700 hover:text-blue-600 font-medium justify-start"
                fullWidth
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default PortfolioHeader;

