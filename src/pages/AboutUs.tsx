import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { useState, useEffect } from 'react';
import { 
    Code, 
    Database, 
    Cpu, 
    Users, 
    Monitor, 
    Server, 
    Radio, 
    Zap, 
    Target, 
    Award,
    CheckCircle2,
    ArrowRight,
    Mail,
    Phone,
    Sparkles,
    Rocket,
    Globe,
    Layers,
    TrendingUp,
    Shield,
    Activity
} from 'lucide-react';
import ReactLogo from '../assets/react.svg';
import TailwindLogo from '../assets/tailwind.svg';
import FlaskLogo from '../assets/Flask.svg';
import MqttLogo from '../assets/mqtt.svg';
import PythonLogo from '../assets/python.svg';
import MysqlLogo from '../assets/mysql.svg';
import RestApiLogo from '../assets/restapi.svg';
import Esp32Logo from '../assets/esp32.svg';
import NodeRedLogo from '../assets/nodered.webp';
import ContainerImage from '../assets/container.webp';
import RizkiImage from '../assets/rizki.png';
import RusdiImage from '../assets/rusdi.png';
import FrendiImage from '../assets/prendi.png';
import FebriImage from '../assets/febri.png';

export default function AboutUs() {
    const { isOpen } = useSidebar();
    
    // scrollY digunakan untuk parallax effect pada background elements
    const [scrollY, setScrollY] = useState(0);
    
    // State untuk track elemen yang sudah visible (untuk fade in effect)
    const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
    
    // Track scroll untuk parallax background
    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    // Intersection Observer untuk fade in effect - sederhana dan profesional
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-10% 0px -10% 0px',
            threshold: 0.1
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const elementId = entry.target.getAttribute('data-fade-in');
                if (!elementId) return;
                
                if (entry.isIntersecting) {
                    setVisibleElements(prev => new Set(prev).add(elementId));
                }
            });
        }, observerOptions);
        
        // Observe semua elemen dengan data-fade-in attribute
        const elements = document.querySelectorAll('[data-fade-in]');
        elements.forEach(el => observer.observe(el));
        
        return () => {
            elements.forEach(el => observer.unobserve(el));
        };
    }, []);

    const teamMembers = [
        {
            name: 'Rizki Putra Sembiring',
            role: 'Supervisor',
            image: RizkiImage,
            email: 'rixki.putra@gistex.com',
            phone: '+62 812-3456-7890',
            description: 'Memimpin dan mengawasi seluruh proses pengembangan sistem monitoring RFID',
            gradient: 'from-yellow-400 via-orange-500 to-red-500'
        },
        {
            name: 'Rusdi Fadli Nuryuda',
            role: 'Frontend Developer',
            image: RusdiImage,
            email: 'rusdi.fadli@gistex.com',
            phone: '+62 812-3456-7891',
            description: 'Mengembangkan antarmuka pengguna yang interaktif dan responsif',
            gradient: 'from-blue-400 via-cyan-500 to-teal-500'
        },
        {
            name: 'Prendi The Backend',
            role: 'Backend Developer',
            image: FrendiImage,
            email: 'frendi.backend@gistex.com',
            phone: '+62 812-3456-7892',
            description: 'Membangun dan mengelola API serta sistem backend yang robust',
            gradient: 'from-green-400 via-emerald-500 to-teal-500'
        },
        {
            name: 'Febriansyah Dwi Makatita',
            role: 'Electrical Engineer',
            image: FebriImage,
            email: 'febriansyah.dwi@gistex.com',
            phone: '+62 812-3456-7893',
            description: 'Mengintegrasikan teknologi RFID dan MQTT untuk komunikasi real-time',
            gradient: 'from-purple-400 via-pink-500 to-rose-500'
        }
    ];

    const features = [
        {
            icon: <Monitor className="w-8 h-8" />,
            title: 'Real-time Monitoring',
            description: 'Pantau data RFID secara real-time dengan update otomatis setiap detik',
            color: 'blue',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            icon: <Database className="w-8 h-8" />,
            title: 'Data Management',
            description: 'Kelola data garment dengan sistem yang terstruktur dan mudah diakses',
            color: 'green',
            gradient: 'from-green-500 to-emerald-500'
        },
        {
            icon: <Radio className="w-8 h-8" />,
            title: 'RFID Tracking',
            description: 'Lacak perjalanan setiap garment melalui berbagai tahap produksi',
            color: 'purple',
            gradient: 'from-purple-500 to-pink-500'
        },
        {
            icon: <Target className="w-8 h-8" />,
            title: 'Line Monitoring',
            description: 'Monitor performa setiap line produksi dengan dashboard interaktif',
            color: 'orange',
            gradient: 'from-orange-500 to-red-500'
        },
        {
            icon: <CheckCircle2 className="w-8 h-8" />,
            title: 'Quality Control',
            description: 'Sistem kontrol kualitas dengan status Good, Rework, dan Reject',
            color: 'teal',
            gradient: 'from-teal-500 to-cyan-500'
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: 'Fast & Responsive',
            description: 'Aplikasi yang cepat dan responsif dengan teknologi modern',
            color: 'yellow',
            gradient: 'from-yellow-500 to-orange-500'
        }
    ];

    return (
        <div className="flex min-h-screen bg-white relative overflow-hidden">
            {/* Animated Background Effects - Subtle untuk background putih dengan Parallax */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl animate-pulse"
                    style={{ 
                        transform: `translateY(${scrollY * 0.3}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                ></div>
                <div 
                    className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl animate-pulse" 
                    style={{ 
                        animationDelay: '1s',
                        transform: `translateY(${-scrollY * 0.2}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                ></div>
                <div 
                    className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-100/20 rounded-full blur-3xl animate-pulse" 
                    style={{ 
                        animationDelay: '2s',
                        transform: `translateY(${scrollY * 0.15}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                ></div>
            </div>

            {/* Grid Pattern Overlay - Subtle untuk background putih */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out relative z-10 overflow-hidden"
                style={{ 
                    marginLeft: isOpen ? '15%' : '5rem', 
                    width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' 
                }}
            >
                {/* Header */}
                <div className="flex-shrink-0">
                    <Header />
                </div>

                {/* Content - Fixed Scrolling */}
                <main
                    className="flex-1 w-full overflow-y-auto pt-20 pb-12 px-4 sm:px-6 md:px-8 lg:px-12 min-h-0"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#3b82f6 #e5e7eb'
                    }}
                >
                    <style>{`
                        main::-webkit-scrollbar {
                            width: 8px;
                        }
                        main::-webkit-scrollbar-track {
                            background: #f3f4f6;
                            border-radius: 4px;
                        }
                        main::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, #3b82f6, #8b5cf6);
                            border-radius: 4px;
                        }
                        main::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #2563eb, #7c3aed);
                        }
                    `}</style>

                    {/* Container/Hero Section - Compact & Seamless */}
                    <div 
                        data-fade-in="container"
                        className={`max-w-6xl mx-auto mb-12 mt-4 transition-all duration-700 ease-out ${
                            visibleElements.has('container')
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-8'
                        }`}
                    >
                        <div className="group relative bg-gradient-to-br from-white via-blue-50/20 to-white rounded-xl shadow-lg hover:shadow-xl overflow-hidden border border-blue-100/30 transition-all duration-500">
                            {/* Animated Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-cyan-500/3 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            {/* Grid Pattern Overlay - Subtle */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-30"></div>
                            
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center p-4 lg:p-6">
                                {/* Left Side - Text Content */}
                                <div className="space-y-4 order-2 lg:order-1">
                                    {/* Title - Improved Font & Size */}
                                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-relaxed tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                        Menyatukan Pengetahuan, Ide, dan{' '}
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 font-extrabold">
                                            Teknologi Kelas Dunia
                                        </span>{' '}
                                        untuk Sistem Monitoring RFID Anda
                                    </h1>
                                    
                                    {/* Call to Action - Compact */}
                                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center pt-1">
                                        <div className="flex-1 relative group/input">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover/input:text-blue-500 transition-colors z-10" />
                                            <input
                                                type="email"
                                                placeholder="Masukan alamat surel..."
                                                className="w-full pl-10 pr-4 py-2.5 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 placeholder:text-gray-400 bg-white hover:border-blue-300"
                                            />
                                        </div>
                                        <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 whitespace-nowrap flex items-center justify-center gap-2 text-sm">
                                            <span>Dapatkan Brosur</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                    
                                    {/* Stats - Compact Design */}
                                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                                        <div className="text-center p-2.5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 hover:bg-blue-100 hover:scale-105 transition-all duration-300 cursor-pointer group/stat">
                                            <div className="text-lg md:text-xl font-black text-blue-600 group-hover/stat:scale-110 transition-transform">100%</div>
                                            <div className="text-xs text-gray-600 mt-0.5 font-medium">Real-time</div>
                                        </div>
                                        <div className="text-center p-2.5 bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg border border-cyan-200 hover:bg-cyan-100 hover:scale-105 transition-all duration-300 cursor-pointer group/stat">
                                            <div className="text-lg md:text-xl font-black text-cyan-600 group-hover/stat:scale-110 transition-transform">24/7</div>
                                            <div className="text-xs text-gray-600 mt-0.5 font-medium">Monitoring</div>
                                        </div>
                                        <div className="text-center p-2.5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 hover:bg-purple-100 hover:scale-105 transition-all duration-300 cursor-pointer group/stat">
                                            <div className="text-lg md:text-xl font-black text-purple-600 group-hover/stat:scale-110 transition-transform">99%</div>
                                            <div className="text-xs text-gray-600 mt-0.5 font-medium">Accuracy</div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Right Side - Illustration - Seamless (No Box) */}
                                <div className="relative order-1 lg:order-2 flex items-center justify-center">
                                    <div className="relative w-full max-w-md mx-auto">
                                        {/* Subtle Glow Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 via-cyan-200/20 to-purple-200/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                                        
                                        {/* Image - Direct, No Container Box */}
                                        <div className="relative z-10">
                                            <img
                                                src={ContainerImage}
                                                alt="RFID Monitoring System"
                                                className="w-full h-auto object-contain transform group-hover:scale-105 transition-transform duration-700"
                                                style={{ maxHeight: '320px' }}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    console.error('Error loading ContainerImage:', ContainerImage);
                                                    if (!target.src.includes('placeholder')) {
                                                        target.src = 'https://via.placeholder.com/500x320?text=Container+Image';
                                                    }
                                                }}
                                                onLoad={() => console.log('ContainerImage loaded successfully:', ContainerImage)}
                                            />
                                        </div>
                                        
                                        {/* Floating Elements - Subtle */}
                                        <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-xl animate-pulse"></div>
                                        <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                    </div>

                    {/* Hero Section with Futuristic Design */}
                    <div 
                        data-fade-in="hero"
                        className={`max-w-7xl mx-auto mb-20 transition-all duration-700 ease-out ${
                            visibleElements.has('hero')
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-8'
                        }`}
                    >
                        <div className="text-center mb-16 relative">
                            {/* Glowing Badge */}
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-100 via-cyan-100 to-blue-100 backdrop-blur-xl rounded-full mb-8 border border-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-300 group">
                                <Sparkles className="w-5 h-5 text-blue-600 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="text-sm font-bold text-blue-700 group-hover:text-blue-800 transition-colors">Gistex Monitoring System</span>
                                <Rocket className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                            </div>
                            
                            {/* Animated Title */}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 mb-8 leading-tight animate-pulse" style={{ lineHeight: '1.2', paddingBottom: '0.5rem' }}>
                                Tentang Aplikasi Kami
                            </h1>
                            
                            {/* Glowing Description */}
                            <div className="relative inline-block">
                                <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed relative z-10 backdrop-blur-sm bg-white/80 p-6 rounded-2xl border border-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-300">
                                    Sistem monitoring RFID yang canggih untuk mengoptimalkan proses produksi garment 
                                    dengan teknologi <span className="text-blue-600 font-semibold">real-time tracking</span> dan 
                                    <span className="text-blue-600 font-semibold"> data analytics</span> yang komprehensif.
                                </p>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-cyan-100/50 rounded-2xl blur-xl -z-10"></div>
                            </div>
                        </div>

                        {/* Features Grid with Futuristic Cards */}
                        <div 
                            data-fade-in="features"
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 transition-all duration-700 ease-out ${
                                visibleElements.has('features')
                                    ? 'opacity-100 translate-y-0'
                                    : 'opacity-0 translate-y-8'
                            }`}
                        >
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="group relative bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-blue-200 hover:border-blue-400 transition-all duration-500 hover:scale-105 hover:rotate-1 shadow-lg hover:shadow-2xl overflow-hidden"
                                    style={{ 
                                        transitionDelay: `${index * 100}ms`,
                                        transitionDuration: '800ms'
                                    }}
                                >
                                    {/* Animated Background Gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`}></div>
                                    
                                    {/* Glowing Border Effect */}
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-200/0 via-cyan-300/30 to-blue-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    
                                    {/* Content */}
                                    <div className="relative z-10">
                                        <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg`}>
                                            {feature.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                                        <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">{feature.description}</p>
                                    </div>
                                    
                                    {/* Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technology Stack Section with 3D Effects */}
                    <div 
                        data-fade-in="techStack"
                        className={`max-w-7xl mx-auto mb-20 transition-all duration-700 ease-out ${
                            visibleElements.has('techStack')
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-8'
                        }`}
                    >
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 backdrop-blur-xl rounded-full mb-6 border border-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all duration-300 group">
                                <Layers className="w-6 h-6 text-purple-600 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="text-sm font-bold text-purple-700 group-hover:text-purple-800 transition-colors">Technology Stack</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 mb-6 leading-tight pb-2 animate-pulse" style={{ lineHeight: '1.2', paddingBottom: '0.5rem' }}>
                                Teknologi yang Digunakan
                            </h2>
                            <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto backdrop-blur-sm bg-white/80 p-4 rounded-xl border border-blue-200 shadow-md">
                                Kombinasi teknologi modern untuk menciptakan sistem monitoring yang powerful dan reliable
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Frontend Developer - 3D Card */}
                            <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-blue-200 hover:border-blue-400 transition-all duration-500 hover:scale-105 hover:-rotate-1 shadow-xl hover:shadow-2xl overflow-hidden"
                            style={{ transitionDelay: '0ms', transitionDuration: '800ms' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                            <Code className="w-10 h-10 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Frontend Developer</h3>
                                            <p className="text-sm text-blue-600">UI/UX Designer & Developer</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-6 leading-relaxed group-hover:text-gray-700 transition-colors">
                                        Mengembangkan dashboard interaktif dengan antarmuka yang modern dan user-friendly. 
                                        Menampilkan data real-time dengan visualisasi yang informatif dan mudah dipahami.
                                    </p>
                                    <div className="space-y-3 mb-6">
                                        {['TypeScript', 'Next.js Framework', 'Tailwind CSS', 'TanStack Query'].map((tech, idx) => (
                                            <div key={idx} className="flex items-center gap-3 group/item">
                                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full shadow-md group-hover/item:scale-150 transition-transform"></div>
                                                <span className="text-gray-700 group-hover/item:text-blue-600 transition-colors font-medium">{tech}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 pt-6 border-t border-blue-200">
                                        <img 
                                            src={ReactLogo} 
                                            alt="React" 
                                            className="h-10 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading ReactLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                        <img 
                                            src={TailwindLogo} 
                                            alt="Tailwind" 
                                            className="h-10 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading TailwindLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </div>

                            {/* Backend Developer - 3D Card */}
                            <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-green-200 hover:border-green-400 transition-all duration-500 hover:scale-105 hover:rotate-1 shadow-xl hover:shadow-2xl overflow-hidden"
                            style={{ transitionDelay: '150ms', transitionDuration: '800ms' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-emerald-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                            <Server className="w-10 h-10 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">Backend Developer</h3>
                                            <p className="text-sm text-green-600">API & Data Management</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-6 leading-relaxed group-hover:text-gray-700 transition-colors">
                                        Mengelola data dengan sistem backend yang robust menggunakan Python dan Flask. 
                                        Menyediakan RESTful API yang efisien untuk komunikasi antara frontend dan database.
                                    </p>
                                    <div className="space-y-3 mb-6">
                                        {['Python', 'Flask Framework', 'RESTful API', 'Database Management'].map((tech, idx) => (
                                            <div key={idx} className="flex items-center gap-3 group/item">
                                                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full shadow-md group-hover/item:scale-150 transition-transform"></div>
                                                <span className="text-gray-700 group-hover/item:text-green-600 transition-colors font-medium">{tech}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 pt-6 border-t border-green-200 flex-wrap">
                                        <img 
                                            src={PythonLogo} 
                                            alt="Python" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all" 
                                            onError={(e) => { 
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading PythonLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }} 
                                        />
                                        <img 
                                            src={MysqlLogo} 
                                            alt="MySQL" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading MysqlLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                        <img 
                                            src={RestApiLogo} 
                                            alt="REST API" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading RestApiLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                        <img 
                                            src={FlaskLogo} 
                                            alt="Flask" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading FlaskLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </div>

                            {/* Electrical Engineer - 3D Card */}
                            <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-purple-200 hover:border-purple-400 transition-all duration-500 hover:scale-105 hover:-rotate-1 shadow-xl hover:shadow-2xl overflow-hidden"
                            style={{ transitionDelay: '300ms', transitionDuration: '800ms' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-pink-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                            <Cpu className="w-10 h-10 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Electrical Engineer</h3>
                                            <p className="text-sm text-purple-600">RFID & IoT Integration</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-6 leading-relaxed group-hover:text-gray-700 transition-colors">
                                        Mengintegrasikan teknologi RFID dan MQTT untuk komunikasi real-time. 
                                        Memastikan sistem hardware dan software bekerja secara seamless untuk monitoring yang akurat.
                                    </p>
                                    <div className="space-y-3 mb-6">
                                        {['RFID Technology', 'MQTT Protocol', 'IoT Integration', 'Hardware Communication'].map((tech, idx) => (
                                            <div key={idx} className="flex items-center gap-3 group/item">
                                                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md group-hover/item:scale-150 transition-transform"></div>
                                                <span className="text-gray-700 group-hover/item:text-purple-600 transition-colors font-medium">{tech}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 pt-6 border-t border-purple-200 flex-wrap">
                                        <img 
                                            src={MqttLogo} 
                                            alt="MQTT" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading MqttLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                        <img 
                                            src={Esp32Logo} 
                                            alt="ESP32" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading Esp32Logo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                        <img 
                                            src={NodeRedLogo} 
                                            alt="Node-RED" 
                                            className="h-8 w-auto opacity-70 hover:opacity-100 hover:scale-110 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                console.error('Error loading NodeRedLogo');
                                                if (!target.src.includes('placeholder')) {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </div>
                        </div>
                    </div>

                    {/* Our Team Section with Futuristic Cards */}
                    <div 
                        data-fade-in="team"
                        className={`max-w-7xl mx-auto mb-20 transition-all duration-700 ease-out ${
                            visibleElements.has('team')
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-8'
                        }`}
                    >
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 backdrop-blur-xl rounded-full mb-6 border border-yellow-300 shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] transition-all duration-300 group">
                                <Users className="w-6 h-6 text-yellow-600 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="text-sm font-bold text-yellow-700 group-hover:text-yellow-800 transition-colors">Tim Kami</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-yellow-600 mb-6 animate-pulse">
                                Our Best Team
                            </h2>
                            <p className="text-lg text-gray-700 max-w-2xl mx-auto backdrop-blur-sm bg-white/80 p-4 rounded-xl border border-blue-200 shadow-md">
                                Tim profesional yang berdedikasi untuk menciptakan sistem monitoring RFID terbaik
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {teamMembers.map((member, index) => (
                                <div
                                    key={index}
                                    className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-blue-200 hover:border-blue-400 transition-all duration-500 hover:scale-105 hover:-rotate-1 shadow-xl hover:shadow-2xl overflow-hidden"
                                    style={{ 
                                        transitionDelay: `${index * 100}ms`,
                                        transitionDuration: '800ms'
                                    }}
                                >
                                    {/* Animated Gradient Background */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`}></div>
                                    
                                    {/* Glowing Border */}
                                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${member.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                                    
                                    <div className="relative z-10">
                                        <div className="relative mb-6">
                                            <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center z-20 shadow-lg group-hover:scale-125 group-hover:rotate-180 transition-all duration-500">
                                                <Award className="w-4 h-4 text-yellow-900" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer border border-blue-300">
                                                <span className="text-blue-600 text-xs">⋯</span>
                                            </div>
                                            <div className={`w-36 h-36 mx-auto rounded-full overflow-hidden border-4 bg-gradient-to-br ${member.gradient} p-1 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                                                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                                                    <img
                                                        src={member.image}
                                                        alt={member.name}
                                                        className="w-full h-full object-cover object-center group-hover:scale-125 transition-transform duration-500"
                                                        style={{ objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            console.error('Error loading team member image:', member.name, member.image);
                                                            if (!target.src.includes('placeholder')) {
                                                                target.src = 'https://via.placeholder.com/200?text=' + encodeURIComponent(member.name.split(' ')[0]);
                                                            }
                                                        }}
                                                        onLoad={() => console.log('Team member image loaded:', member.name, member.image)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{member.name}</h3>
                                            <p className={`text-sm font-semibold bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent mb-3`}>{member.role}</p>
                                            <p className="text-xs text-gray-500 mb-6 leading-relaxed group-hover:text-gray-600 transition-colors">{member.description}</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{member.phone}</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors">
                                                    <Mail className="w-4 h-4" />
                                                    <a href={`mailto:${member.email}`} className="hover:underline">
                                                        {member.email}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Shine Effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional About Section with Glassmorphism */}
                    <div 
                        data-fade-in="about"
                        className={`max-w-7xl mx-auto mb-12 transition-all duration-700 ease-out ${
                            visibleElements.has('about')
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-8'
                        }`}
                    >
                        <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 backdrop-blur-2xl rounded-3xl p-8 md:p-12 text-gray-900 shadow-2xl border border-blue-200 overflow-hidden group">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            {/* Grid Pattern */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:30px_30px] opacity-30"></div>
                            
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6 border border-blue-300 shadow-md">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-700">Keunggulan Sistem</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                        Mengapa Memilih Sistem Kami?
                                    </h2>
                                    <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                                        Sistem monitoring RFID kami dirancang khusus untuk meningkatkan efisiensi 
                                        dan akurasi dalam proses produksi garment. Dengan teknologi <span className="text-blue-600 font-bold">real-time tracking</span>, 
                                        Anda dapat memantau setiap tahap produksi dengan detail dan presisi.
                                    </p>
                                    <div className="space-y-4">
                                        {[
                                            { title: 'Real-time Data Tracking', desc: 'Pantau pergerakan garment secara real-time dengan update otomatis', icon: Activity },
                                            { title: 'Comprehensive Analytics', desc: 'Analisis data produksi dengan dashboard yang informatif dan mudah dipahami', icon: TrendingUp },
                                            { title: 'Scalable Architecture', desc: 'Sistem yang dapat berkembang sesuai kebutuhan bisnis Anda', icon: Globe }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200 hover:bg-white/80 hover:border-blue-300 transition-all duration-300 group/item shadow-md">
                                                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover/item:scale-110 group-hover/item:rotate-12 transition-all duration-300">
                                                    <item.icon className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold mb-1 text-gray-900 group-hover/item:text-blue-600 transition-colors">{item.title}</h4>
                                                    <p className="text-gray-600 text-sm group-hover/item:text-gray-700 transition-colors">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 group/card">
                                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
                                        <Sparkles className="w-6 h-6 text-blue-600 group-hover/card:rotate-180 transition-transform duration-500" />
                                        <span>Fitur Utama</span>
                                    </h3>
                                    <ul className="space-y-4">
                                        {[
                                            'Monitoring Real-time untuk semua Line Produksi',
                                            'Tracking RFID Garment dari awal hingga akhir',
                                            'Quality Control dengan status Good, Rework, Reject',
                                            'Dashboard Interaktif dengan Visualisasi Data',
                                            'Export Data untuk Analisis Lanjutan',
                                            'Sistem Notifikasi Real-time'
                                        ].map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-3 group/item p-2 rounded-lg hover:bg-blue-50 transition-all duration-300">
                                                <ArrowRight className="w-5 h-5 text-blue-600 group-hover/item:translate-x-2 group-hover/item:scale-125 transition-all duration-300" />
                                                <span className="text-gray-700 group-hover/item:text-blue-600 transition-colors">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
