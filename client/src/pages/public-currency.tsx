import { Link } from "wouter";
import { ArrowLeft, ArrowRightLeft, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const currencies = [
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
];

const exchangeRates: Record<string, number> = {
  AED: 1,
  USD: 0.2723,
  EUR: 0.2519,
  GBP: 0.2165,
  ILS: 1.0000,
  SAR: 1.0211,
  INR: 22.78,
  CNY: 1.9782,
  RUB: 27.15,
};

const popularPairs = [
  { from: "AED", to: "USD", amount: 100 },
  { from: "AED", to: "EUR", amount: 100 },
  { from: "AED", to: "ILS", amount: 100 },
  { from: "USD", to: "AED", amount: 100 },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function PublicCurrency() {
  const [fromCurrency, setFromCurrency] = useState("AED");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState<string>("100");
  const [result, setResult] = useState<number>(0);
  const [lastUpdated] = useState(new Date().toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }));

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const fromRate = exchangeRates[fromCurrency];
    const toRate = exchangeRates[toCurrency];
    const converted = (numAmount / fromRate) * toRate;
    setResult(converted);
  }, [amount, fromCurrency, toCurrency]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getRate = (from: string, to: string) => {
    return (exchangeRates[to] / exchangeRates[from]).toFixed(4);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen relative">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <section className="pt-32 pb-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#6443F4] mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-[#6443F4]" />
              </div>
              <div>
                <h1 
                  className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Currency Converter
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Convert UAE Dirham to popular currencies</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 sm:p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-12 px-4 pr-20 text-lg font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6443F4]"
                      placeholder="Enter amount"
                      data-testid="input-amount"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Select value={fromCurrency} onValueChange={setFromCurrency}>
                        <SelectTrigger className="w-20 h-8 text-sm border-0 bg-slate-100 dark:bg-slate-700" data-testid="select-from-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={swapCurrencies}
                    className="rounded-full border-slate-200 dark:border-slate-700"
                    data-testid="button-swap"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Converted To</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumber(result)}
                      readOnly
                      className="w-full h-12 px-4 pr-20 text-lg font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-not-allowed"
                      data-testid="input-result"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Select value={toCurrency} onValueChange={setToCurrency}>
                        <SelectTrigger className="w-20 h-8 text-sm border-0 bg-white dark:bg-slate-700" data-testid="select-to-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      1 {fromCurrency} = {getRate(fromCurrency, toCurrency)} {toCurrency}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      1 {toCurrency} = {getRate(toCurrency, fromCurrency)} {fromCurrency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-3 h-3" />
                    <span>Last updated: {lastUpdated}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 
              className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              Popular Conversions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {popularPairs.map((pair, index) => {
                const rate = (exchangeRates[pair.to] / exchangeRates[pair.from]);
                const converted = pair.amount * rate;
                return (
                  <Card 
                    key={index} 
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    onClick={() => {
                      setFromCurrency(pair.from);
                      setToCurrency(pair.to);
                      setAmount(pair.amount.toString());
                    }}
                    data-testid={`card-conversion-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{getCurrencySymbol(pair.from)}{pair.amount} {pair.from}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">to {pair.to}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#6443F4]">{getCurrencySymbol(pair.to)}{formatNumber(converted)}</p>
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <TrendingUp className="w-3 h-3" />
                          <span>1:{rate.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 
              className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              All Exchange Rates (AED Base)
            </h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              {currencies.filter(c => c.code !== "AED").map((currency) => {
                const rate = exchangeRates[currency.code];
                return (
                  <div 
                    key={currency.code} 
                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setFromCurrency("AED");
                      setToCurrency(currency.code);
                    }}
                    data-testid={`rate-${currency.code}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#6443F4]/10 flex items-center justify-center text-[#6443F4] font-bold text-sm">
                        {currency.code}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{currency.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{currency.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{currency.symbol}{rate.toFixed(4)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">per 1 AED</p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </motion.div>

          <Card className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Exchange rates are for informational purposes only and may differ from actual rates at banks or exchange offices. Always verify current rates before making transactions.
            </p>
          </Card>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-8 bg-slate-900 dark:bg-slate-800 border-0 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Plan Your Dubai Trip
                  </h3>
                  <p className="text-white/80">Calculate costs, find events, and book your travel</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/tools/budget">
                    <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" data-testid="link-budget">
                      Budget Calculator
                    </Button>
                  </Link>
                  <Link href="/tools/events">
                    <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="link-events">
                      Events Calendar
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
