import { Container, Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { Code, Design, Rocket } from '@mui/icons-material';

const About = () => {
  const services = [
    {
      icon: <Code className="text-5xl text-blue-600" />,
      title: 'Web Development',
      description: 'Membangun aplikasi web modern dengan React, TypeScript, dan teknologi terbaru',
    },
    {
      icon: <Design className="text-5xl text-purple-600" />,
      title: 'UI/UX Design',
      description: 'Mendesain antarmuka yang menarik dan user-friendly dengan Material UI dan Tailwind CSS',
    },
    {
      icon: <Rocket className="text-5xl text-pink-600" />,
      title: 'Performance Optimization',
      description: 'Mengoptimalkan performa aplikasi untuk pengalaman pengguna yang lebih baik',
    },
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <Container maxWidth="lg">
        <Box className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Tentang <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Saya</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Saya adalah seorang web developer yang passionate tentang membuat solusi digital yang inovatif
          </p>
        </Box>

        <Grid container spacing={4} className="mb-16">
          {services.map((service, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                <CardContent className="text-center p-8">
                  <Box className="mb-4 flex justify-center">
                    {service.icon}
                  </Box>
                  <Typography variant="h5" className="font-bold text-gray-900 mb-3">
                    {service.title}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600">
                    {service.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Passionate Developer
              </h3>
              <p className="text-gray-700 mb-4 leading-relaxed">
                Dengan pengalaman dalam mengembangkan aplikasi web modern, saya fokus pada 
                menciptakan solusi yang tidak hanya fungsional tetapi juga memberikan pengalaman 
                pengguna yang luar biasa.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Saya selalu mengikuti perkembangan teknologi terbaru dan menerapkan best practices 
                dalam setiap proyek yang saya kerjakan.
              </p>
            </Grid>
            <Grid item xs={12} md={6}>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-6 text-center shadow-md">
                  <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
                  <div className="text-gray-600">Proyek Selesai</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-md">
                  <div className="text-4xl font-bold text-purple-600 mb-2">3+</div>
                  <div className="text-gray-600">Tahun Pengalaman</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-md">
                  <div className="text-4xl font-bold text-pink-600 mb-2">30+</div>
                  <div className="text-gray-600">Klien Puas</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-md">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">100%</div>
                  <div className="text-gray-600">Kepuasan</div>
                </div>
              </div>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </section>
  );
};

export default About;

