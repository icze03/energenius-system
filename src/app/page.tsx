

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Zap,
  BarChart3,
  BrainCircuit,
  SlidersHorizontal,
  Clock,
  User,
  Linkedin,
  Mail,
  Target,
  FileText,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';

const features = [
  {
    icon: BarChart3,
    title: 'Consumption Visualization',
    description: 'View real-time and historical energy data with clear, interactive charts.',
    imageUrl: '/images/features/ConsumptionVisualization.jpeg'
  },
  {
    icon: Target,
    title: 'Target Setting',
    description: 'Set and track your energy usage targets to encourage efficient consumption.',
    imageUrl: '/images/features/TargetSetting.jpeg'
  },
  {
    icon: FileText,
    title: 'Reporting & Analysis',
    description: 'Compare current energy performance against past trends and goals.',
    imageUrl: '/images/features/ReportingAnalysis.jpeg'
  },
  {
    icon: BrainCircuit,
    title: 'Smart Recommendations',
    description: 'Receive energy-saving suggestions customized for your office patterns.',
    imageUrl: '/images/features/SmartRecommendations.jpeg'
  },
  {
    icon: Clock,
    title: 'Device Scheduling',
    description: 'Automate and optimize device operations based on time and energy demand.',
    imageUrl: '/images/features/DeviceScheduling.jpeg'
  },
  {
    icon: Zap,
    title: 'Adaptive Control Agent',
    description: 'Use an integrated agent to analyze usage and offer personalized adjustments.',
    imageUrl: '/images/features/AdaptiveControlAgent.jpeg'
  },
];

const teamMembers = [
    { name: 'Klein Isaac G. Imperio', role: 'Project Manager, Lead Developer, Backend, Database & Frontend Dev.', image: '/images/klein.jpeg' },
    { name: 'Mikhaela Acel G. Esporlas', role: 'UI/UX Designer & Research and Development', image: '/images/mikhaela.jpeg' },
    { name: 'Erika', role: 'Documentation Manager & product development', image: '/images/erika.jpeg' },
];

export default function WelcomePage() {
  const { theme } = useTheme();
  return (
    <div className={cn("flex flex-col min-h-screen font-body text-foreground/90 overflow-x-hidden bg-background")}>
      
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm border-b border-border/10">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Zap className="h-7 w-7" />
          <span>Energenius</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section
          id="hero"
          className="relative flex items-center justify-center min-h-screen pt-24 pb-12 text-center overflow-hidden"
        >
          <div className="absolute inset-0 -z-10 h-full w-full bg-[#0a101f] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.3),rgba(255,255,255,0))] animate-background-pan"></div>
           <div className="container mx-auto px-4 z-10 animate-fade-in-up grid md:grid-cols-2 gap-8 items-center">
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                Smarter Energy Decisions for a Sustainable Future.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Energenius empowers SMEs to visualize, control, and optimize their energy consumption using real-time analytics.
              </p>
              <div className="mt-8 flex justify-start gap-4">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow-accent" asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="relative circuit-border rounded-lg p-1">
                <div className="relative h-64 md:h-96">
                    <Image
                        src="https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNXx8ZW5lcmd5fGVufDB8fHx8MTc2MjYwNTEwNnww&ixlib=rb-4.1.0&q=80&w=1080"
                        alt="Dashboard Mockup"
                        fill
                        className="object-cover rounded-lg shadow-2xl"
                        data-ai-hint="dashboard analytics"
                    />
                     <div className="absolute inset-0 bg-black/40 rounded-lg"></div>
                </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto text-center px-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Core Features</h2>
            <p className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              All-in-One Smart Energy Management Platform
            </p>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="relative circuit-border rounded-lg p-[1px] transition-all duration-300 hover:scale-105">
                  <Card className="relative bg-card/50 border-none text-left h-full backdrop-blur-sm overflow-hidden">
                    <Image
                      src={feature.imageUrl}
                      alt={feature.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60"></div>
                    <div className="relative z-10 flex flex-col h-full p-6">
                      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary mb-4">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm text-gray-300">{feature.description}</p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section id="cta" className="py-20 text-center">
            <div className="container mx-auto px-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                 <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    Ready to Take Control of Your Energy Efficiency?
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Start your journey toward sustainable energy management today with Energenius.
                </p>
                <div className="mt-8">
                     <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow-accent animate-pulse" asChild>
                        <Link href="/login">Sign In Now</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-20 bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto text-center px-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary">The Team</h2>
                <p className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    Built by Innovators
                </p>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                     {teamMembers.map((member, index) => (
                        <div key={index} className="flex flex-col items-center">
                             <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 text-primary mb-4 border-2 border-primary/20 shadow-glow-primary-sm">
                                {member.image ? (
                                    <Image
                                        src={member.image}
                                        alt={member.name}
                                        width={80}
                                        height={80}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="h-10 w-10" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold">{member.name}</h3>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>

      <footer className="py-8 bg-transparent border-t border-border/10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground px-4">
          <p>© 2025 Energenius. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <div className="flex items-center gap-4">
                 <Link href="#" aria-label="LinkedIn" className="hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                </Link>
                <Link href="mailto:support@energenius.com" aria-label="Email" className="hover:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

    