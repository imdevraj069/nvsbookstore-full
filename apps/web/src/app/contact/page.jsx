"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Users, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    details: ["info.nvsbookstore@gmail.com"],
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Phone,
    title: "Phone",
    details: ["+91 9142324498 (WhatsApp)", "+91 6203 662 259"],
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: MapPin,
    title: "Address",
    details: ["Safakhana Road", "Dumraon, Buxar, 802119", "Bihar, India"],
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Mon-Fri: 9:00 AM - 6:00 PM", "Saturday: 10:00 AM - 4:00 PM", "Sunday: Closed"],
    gradient: "from-orange-500 to-red-500",
  },
];

const stats = [
  { icon: Users, value: "10,000+", label: "Happy Customers" },
  { icon: MessageCircle, value: "24/7", label: "Support Available" },
  { icon: Award, value: "5 Years", label: "Experience" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen pt-4">
        {/* Hero Section */}
        <motion.section
          className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              className="text-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <MessageCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Get In Touch</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 text-transparent bg-clip-text">
                Contact Us
              </h1>
              <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20"
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-orange-600" />
                  <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Main Content */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Contact Information */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900">
                    Let&apos;s Start a Conversation
                  </h2>
                  <p className="text-lg text-slate-600">
                    We&apos;re here to help and answer any question you might have. We look forward to hearing from you.
                  </p>
                </div>

                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {contactInfo.map((info) => (
                    <motion.div
                      key={info.title}
                      variants={itemVariants}
                      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                      className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                    >
                      <motion.div
                        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${info.gradient} mb-4`}
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <info.icon className="h-6 w-6 text-white" />
                      </motion.div>
                      <h3 className="font-semibold text-lg mb-3 text-slate-900">{info.title}</h3>
                      <div className="space-y-1">
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-slate-600 text-sm">{detail}</p>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-slate-200"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2 text-slate-900">Send us a Message</h3>
                  <p className="text-slate-600">Fill out the form and we&apos;ll get back to you shortly.</p>
                </div>

                {isSubmitted ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">Message Sent!</h4>
                    <p className="text-slate-600 mb-6">Thank you for contacting us. We&apos;ll get back to you soon.</p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                      Send Another Message
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                        <input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50" />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                        <input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50" />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50" />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                      <input id="subject" name="subject" value={formData.subject} onChange={handleInputChange} required disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50" />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                      <textarea id="message" name="message" rows={5} placeholder="Tell us how we can help you..." value={formData.message} onChange={handleInputChange} required disabled={isSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition resize-none disabled:opacity-50" />
                    </div>

                    <motion.div whileHover={{ scale: isSubmitting ? 1 : 1.02 }} whileTap={{ scale: isSubmitting ? 1 : 0.98 }}>
                      <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50">
                        {isSubmitting ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sending...</>
                        ) : (
                          <><Send className="w-5 h-5 mr-2" />Send Message</>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <motion.section
          className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-900 to-slate-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="container mx-auto max-w-4xl text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-slate-300 mb-8 text-lg">
              Join thousands of satisfied customers who trust us for their educational needs.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg">
                <Link href="/store">Explore Our Store</Link>
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </div>
      <Footer />
    </>
  );
}
