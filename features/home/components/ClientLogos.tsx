import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";

const clients = [
  {
    name: "TechCorp",
    logo: "/images/clients/techcorp.svg",
    url: "https://techcorp.com",
  },
  {
    name: "InnovateLab",
    logo: "/images/clients/innovatelab.svg",
    url: "https://innovatelab.io",
  },
  {
    name: "DataFlow",
    logo: "/images/clients/dataflow.svg",
    url: "https://dataflow.ai",
  },
  {
    name: "ScaleUp",
    logo: "/images/clients/scaleup.svg",
    url: "https://scaleup.co",
  },
  {
    name: "AutomatePro",
    logo: "/images/clients/automatepro.svg",
    url: "https://automatepro.com",
  },
];

const testimonials = [
  {
    quote:
      "Pantaleone AI helped us reduce support costs by 40% while improving customer satisfaction. The ROI was incredible.",
    author: "Sarah Chen",
    role: "CTO",
    company: "TechCorp",
  },
  {
    quote:
      "The n8n workflows they built saved us 120 hours per month. Our team can now focus on strategy instead of data entry.",
    author: "Marcus Johnson",
    role: "VP Operations",
    company: "InnovateLab",
  },
  {
    quote:
      "Enterprise-grade AI agents with proper security and governance. Exactly what we needed for our compliance requirements.",
    author: "Elena Rodriguez",
    role: "Head of AI",
    company: "DataFlow",
  },
];

export default function ClientLogos() {
  return (
    <section className="py-12">
      <HeadingTitle title="Trusted by Leading Companies" />
      <SeparatorHorizontal short={true} />

      {/* Client Logos Grid */}
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-12">
        {clients.map((client) => (
          <a
            key={client.name}
            href={client.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group opacity-60 hover:opacity-100 transition-opacity"
          >
            <img
              src={client.logo}
              alt={`${client.name} logo`}
              className="h-8 md:h-10 w-auto grayscale group-hover:grayscale-0 transition-all"
            />
          </a>
        ))}
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.author}
            className="bg-muted/50 rounded-lg p-6 border border-border/50"
          >
            <p className="text-sm mb-4 italic">"{testimonial.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {testimonial.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="text-sm font-medium">{testimonial.author}</p>
                <p className="text-xs text-muted-foreground">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">
          Ready to join these companies?
        </p>
        <a
          href="/contact"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Schedule a Consultation
        </a>
      </div>
    </section>
  );
}
