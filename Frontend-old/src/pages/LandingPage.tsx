import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Video, 
    Book, 
    Rocket,
    User,
    CheckCircle,
    Clock,
    Star,
    Globe
} from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="text-center py-16 px-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-b-[20px] text-white">
                <h1 className="text-5xl font-bold mb-4">
                    AI Lesson Maker
                </h1>
                <p className="text-xl max-w-3xl mx-auto mb-8">
                    Transform your content into engaging video lessons in minutes with AI-powered educational tools
                </p>
                <div className="flex gap-4 justify-center">
                    <Button 
                        onClick={() => navigate('/login')}
                        className="bg-white text-blue-500 hover:bg-gray-100 font-bold h-12 px-8"
                    >
                        Log In
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => navigate('/register')}
                        className="border-white text-white hover:bg-white hover:text-blue-500 font-bold h-12 px-8"
                    >
                        Sign Up
                    </Button>
                </div>
            </div>            {/* Features Section */}
            <div className="py-16 px-5">
                <h2 className="text-3xl font-bold text-center mb-12">
                    Powerful AI Tools for Educators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">                    <Card className="h-full text-center">
                        <CardHeader>
                            <div className="bg-blue-50 p-8 mb-4 flex justify-center">
                                <Video className="w-16 h-16 text-blue-500" />
                            </div>
                            <CardTitle>AI Lesson Maker</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Convert your text content into professional video lessons with AI narration, visual elements, and engaging animations.
                            </p>
                        </CardContent>
                    </Card>
                      <Card className="h-full text-center">
                        <CardHeader>
                            <div className="bg-green-50 p-8 mb-4 flex justify-center">
                                <Book className="w-16 h-16 text-green-500" />
                            </div>
                            <CardTitle>AI Course Maker</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Build comprehensive courses with multiple lessons, structured learning paths and assessments.
                            </p>
                        </CardContent>
                    </Card>
                      <Card className="h-full text-center">
                        <CardHeader>
                            <div className="bg-purple-50 p-8 mb-4 flex justify-center">
                                <Rocket className="w-16 h-16 text-purple-500" />
                            </div>
                            <CardTitle>Fast & Efficient</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">
                                Create professional educational content in minutes instead of hours. Save time while delivering high-quality lessons.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>            {/* Benefits Section */}
            <div className="py-16 px-5 bg-white">
                <h2 className="text-3xl font-bold text-center mb-12">
                    Why Choose AI Lesson Maker?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">                    {[
                        {
                            title: 'Save Time',
                            description: 'Create professional educational videos in minutes instead of hours or days.',
                            icon: <Clock className="w-10 h-10 text-blue-500" />
                        },
                        {
                            title: 'Easy to Use',
                            description: 'No technical skills required. Simply input your content and our AI does the rest.',
                            icon: <CheckCircle className="w-10 h-10 text-green-500" />
                        },
                        {
                            title: 'Professional Quality',
                            description: 'Get high-quality videos with natural voiceovers and engaging visuals every time.',
                            icon: <Star className="w-10 h-10 text-yellow-500" />
                        },
                        {
                            title: 'Multilingual Support',
                            description: 'Create content in multiple languages to reach a global audience.',
                            icon: <Globe className="w-10 h-10 text-purple-500" />
                        }
                    ].map((benefit, index) => (
                        <div key={index} className="text-center p-6 h-full rounded-lg bg-gray-50 shadow-sm">
                            <div className="mb-4">
                                {benefit.icon}
                            </div>
                            <h4 className="text-xl font-semibold mb-3">{benefit.title}</h4>
                            <p className="text-gray-600">{benefit.description}</p>
                        </div>
                    ))}
                </div>
            </div>            {/* Testimonials Section */}
            <div className="py-16 px-5 bg-blue-50">
                <h2 className="text-3xl font-bold text-center mb-12">
                    What Educators Are Saying
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">                    {[
                        {
                            quote: "AI Lesson Maker has transformed how I create content for my students. What used to take me days now takes minutes!",
                            author: "Sarah J., High School Teacher",
                            avatar: <User className="w-8 h-8 p-2 bg-blue-500 rounded-full text-white" />
                        },
                        {
                            quote: "My students are more engaged than ever with the professional quality videos I can now produce for every lesson.",
                            author: "Michael T., University Professor",
                            avatar: <User className="w-8 h-8 p-2 bg-green-500 rounded-full text-white" />
                        },
                        {
                            quote: "The multilingual feature allowed me to create content for my international students in their native languages. Amazing tool!",
                            author: "Elena K., Online Course Creator",
                            avatar: <User className="w-8 h-8 p-2 bg-purple-500 rounded-full text-white" />
                        }
                    ].map((testimonial, index) => (
                        <Card key={index} className="h-full shadow-lg">
                            <CardContent className="text-center p-6">
                                <div className="mb-4">
                                    {testimonial.avatar}
                                </div>
                                <p className="text-lg italic mb-4 text-gray-700">
                                    "{testimonial.quote}"
                                </p>
                                <p className="font-semibold text-gray-900">
                                    {testimonial.author}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="text-center py-16 px-5 bg-gray-100 rounded-[20px]">
                <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Teaching?</h2>
                <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-600">
                    Join thousands of educators creating engaging video lessons with AI
                </p>
                <Button 
                    size="lg"
                    onClick={() => navigate('/register')}
                    className="h-12 px-8 text-lg"
                >
                    Get Started Now
                </Button>
            </div>
        </div>
    );
};

export default LandingPage;
