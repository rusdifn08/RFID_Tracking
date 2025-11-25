import { Container, Box, Grid, TextField, Button, Card, CardContent, Typography } from '@mui/material';
import { Email, Phone, LocationOn, LinkedIn, GitHub, Twitter } from '@mui/icons-material';

const Contact = () => {
  const contactInfo = [
    {
      icon: <Email className="text-3xl text-blue-600" />,
      title: 'Email',
      value: 'your.email@example.com',
      link: 'mailto:your.email@example.com',
    },
    {
      icon: <Phone className="text-3xl text-purple-600" />,
      title: 'Telepon',
      value: '+62 812-3456-7890',
      link: 'tel:+6281234567890',
    },
    {
      icon: <LocationOn className="text-3xl text-pink-600" />,
      title: 'Lokasi',
      value: 'Jakarta, Indonesia',
      link: '#',
    },
  ];

  const socialLinks = [
    { icon: <LinkedIn />, name: 'LinkedIn', url: 'https://linkedin.com', color: 'text-blue-600' },
    { icon: <GitHub />, name: 'GitHub', url: 'https://github.com', color: 'text-gray-900' },
    { icon: <Twitter />, name: 'Twitter', url: 'https://twitter.com', color: 'text-blue-400' },
  ];

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <Container maxWidth="lg">
        <Box className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Hubungi <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Saya</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Mari berkolaborasi dan wujudkan ide Anda menjadi kenyataan
          </p>
        </Box>

        <Grid container spacing={6}>
          {/* Contact Information */}
          <Grid item xs={12} md={4}>
            <Box className="space-y-4">
              {contactInfo.map((info, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <CardContent className="p-6">
                    <Box className="flex items-start gap-4">
                      <Box className="mt-1">{info.icon}</Box>
                      <Box>
                        <Typography variant="h6" className="font-bold text-gray-900 mb-1">
                          {info.title}
                        </Typography>
                        <a
                          href={info.link}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          {info.value}
                        </a>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Social Links */}
              <Card className="border border-gray-100">
                <CardContent className="p-6">
                  <Typography variant="h6" className="font-bold text-gray-900 mb-4">
                    Ikuti Saya
                  </Typography>
                  <Box className="flex gap-4">
                    {socialLinks.map((social, index) => (
                      <a
                        key={index}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${social.color} hover:scale-110 transition-transform duration-300`}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          {/* Contact Form */}
          <Grid item xs={12} md={8}>
            <Card className="border border-gray-100 shadow-lg">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Nama"
                        variant="outlined"
                        className="bg-white"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        variant="outlined"
                        className="bg-white"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Subjek"
                        variant="outlined"
                        className="bg-white"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Pesan"
                        multiline
                        rows={6}
                        variant="outlined"
                        className="bg-white"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Kirim Pesan
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </section>
  );
};

export default Contact;

