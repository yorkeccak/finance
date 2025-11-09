'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Check, Loader2, ExternalLink } from 'lucide-react';

interface EnterpriseContactModalProps {
  open: boolean;
  onClose: () => void;
}

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees'
];

const INDUSTRIES = [
  'Hedge Fund',
  'Investment Bank',
  'Asset Management',
  'Private Equity',
  'Venture Capital',
  'Financial Services',
  'Research Firm',
  'Technology',
  'Consulting',
  'Other'
];

export function EnterpriseContactModal({ open, onClose }: EnterpriseContactModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    companySize: '',
    industry: '',
    contactName: '',
    contactEmail: '',
    jobTitle: '',
    useCase: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [bookedCall, setBookedCall] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFormValid = () => {
    return formData.companyName &&
           formData.contactName &&
           formData.contactEmail &&
           formData.jobTitle &&
           formData.useCase;
  };

  const handleSubmit = async (shouldBookCall: boolean) => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    setBookedCall(shouldBookCall);

    try {
      const response = await fetch('/api/enterprise/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bookedCall: shouldBookCall
        })
      });

      if (response.ok) {
        setSubmitSuccess(true);

        // If booking call, open Calendly
        if (shouldBookCall) {
          window.open('https://calendly.com/henk-valyu/coffee-chat-with-hendrik', '_blank');
        }

        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            companyName: '',
            companySize: '',
            industry: '',
            contactName: '',
            contactEmail: '',
            jobTitle: '',
            useCase: ''
          });
          setSubmitSuccess(false);
          setBookedCall(false);
          onClose();
        }, 3000);
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Enterprise Contact Form</DialogTitle>

        <AnimatePresence mode="wait">
          {submitSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Thanks for your enquiry
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {bookedCall ? "Booking call with Hendrik" : "We'll be in touch soon"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                  <Building2 className="w-7 h-7 text-slate-700 dark:text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Enterprise AI Search Infrastructure
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto">
                  Deploy institutional-grade financial search and AI agents in your organization
                </p>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Company Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Company Details</h3>

                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Company Size
                      </label>
                      <Select value={formData.companySize} onValueChange={(value) => handleSelectChange('companySize', value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Industry
                      </label>
                      <Select value={formData.industry} onValueChange={(value) => handleSelectChange('industry', value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your Details</h3>

                  <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        id="contactEmail"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="john@acme.com"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        id="jobTitle"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        placeholder="VP of Research"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Use Case */}
                <div>
                  <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tell us about your needs <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="useCase"
                    name="useCase"
                    value={formData.useCase}
                    onChange={handleChange}
                    rows={4}
                    className="resize-none"
                    placeholder="Describe your use case, team size, specific requirements, or integration needs..."
                    required
                  />
                </div>

                {/* Trust Signals */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Check className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      <p className="font-medium mb-1">Enterprise-grade security</p>
                      <p className="text-slate-600 dark:text-slate-400">Trusted by leading financial institutions worldwide</p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={!isFormValid() || isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Submit & Book Call</span>
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
