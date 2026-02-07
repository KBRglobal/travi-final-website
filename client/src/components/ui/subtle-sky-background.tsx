import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SubtleSkyBackgroundProps {
  className?: string;
}

export default function SubtleSkyBackground({ className }: SubtleSkyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      time += 0.0005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#fffdf9";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const layers = [
        { color: "rgba(247, 243, 236, 0.25)", speed: 0.2, amplitude: 50, yOffset: 0.25, blur: 200 },
        { color: "rgba(245, 238, 225, 0.2)", speed: 0.15, amplitude: 60, yOffset: 0.5, blur: 220 },
        { color: "rgba(250, 245, 237, 0.22)", speed: 0.18, amplitude: 45, yOffset: 0.7, blur: 190 },
      ];

      layers.forEach(layer => {
        ctx.save();
        ctx.filter = `blur(${layer.blur}px)`;
        ctx.beginPath();
        ctx.moveTo(-200, canvas.height + 200);

        for (let x = -200; x <= canvas.width + 200; x += 15) {
          const y =
            canvas.height * layer.yOffset +
            Math.sin(x * 0.0008 + time * layer.speed) * layer.amplitude +
            Math.sin(x * 0.0012 + time * layer.speed * 0.4) * (layer.amplitude * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width + 200, canvas.height + 200);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.restore();
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("fixed inset-0 w-full h-full -z-10", className)} />;
}
