// Data Source: TripAdvisor API (pending integration)
// Purpose: Hotel detail page - data repository
// Status: Awaiting API credentials

import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/public-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Building2, Sparkles, Star, Globe
} from "lucide-react";

export default function HotelDetail() {
  const [, params] = useRoute("/hotels/:hotelId");
  const { hotelId = "" } = params ?? {};

  return (
    <PageContainer>
      <Helmet>
        <title>Hotel Details - Coming Soon | TRAVI</title>
        <meta name="description" content="Hotel details and information coming soon. We're integrating TripAdvisor data to bring you comprehensive hotel information." />
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <section 
        className="relative w-full overflow-hidden bg-gradient-to-br from-[#6443F4] via-[#5339D9] to-[#4a2fc7]"
        data-testid="section-hotel-hero"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <Link href="/hotels">
            <Button variant="ghost" className="text-white mb-6" data-testid="btn-back-to-hotels">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Hotels
            </Button>
          </Link>
          
          <div className="text-center">
            <Badge 
              className="mb-4 sm:mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
              data-testid="badge-coming-soon"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
              Data Coming Soon
            </Badge>
            
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Chillax, sans-serif' }}
              data-testid="heading-hotel-detail"
            >
              Hotel Details
            </h1>
            
            {hotelId && (
              <p className="text-white/60 text-sm">ID: {hotelId}</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-slate-200 bg-white">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-[#6443F4]" />
            </div>
            <h2 
              className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4"
              style={{ fontFamily: 'Chillax, sans-serif' }}
              data-testid="heading-data-coming-soon"
            >
              Hotel Information Coming Soon
            </h2>
            <p className="text-slate-600 max-w-lg mx-auto mb-6" data-testid="text-data-coming-soon">
              We're integrating TripAdvisor's comprehensive hotel database to bring you verified 
              information including amenities, ratings, reviews, and photos.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Badge className="bg-[#6443F4]/10 text-[#6443F4] px-4 py-2">
                <Building2 className="w-4 h-4 mr-2" />
                Verified Info
              </Badge>
              <Badge className="bg-[#6443F4]/10 text-[#6443F4] px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                Reviews
              </Badge>
              <Badge className="bg-[#6443F4]/10 text-[#6443F4] px-4 py-2">
                <Globe className="w-4 h-4 mr-2" />
                Photos
              </Badge>
            </div>
            
            <Link href="/hotels">
              <Button className="bg-[#6443F4] hover:bg-[#5339D9] text-white" data-testid="btn-browse-hotels">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse All Hotels
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}
