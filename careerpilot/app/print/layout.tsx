import "./print.css";

export const metadata = {
  title: "Print — CareerPilot",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root">{children}</div>;
}
