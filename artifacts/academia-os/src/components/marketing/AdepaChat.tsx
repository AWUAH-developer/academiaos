'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

type ChatMessage = {
  id: number;
  role: 'visitor' | 'adepa';
  text: string;
};

const quickQuestions = [
  'Compare packages',
  'Book a demo',
  'How do daily fees work?',
  'Tell me about Smart ID',
];

function getAdepaReply(rawQuestion: string) {
  const question = rawQuestion.toLowerCase().trim();

  if (
    question.includes('hello') ||
    question.includes('hi') ||
    question.includes('good morning') ||
    question.includes('good afternoon') ||
    question.includes('akwaaba')
  ) {
    return 'Akwaaba! I am Adepa, the AcademiaOS website assistant. I can explain our features, packages, Smart ID, daily fees, mobile access and demo process.';
  }

  if (
    question.includes('price') ||
    question.includes('pricing') ||
    question.includes('cost') ||
    question.includes('package') ||
    question.includes('starter') ||
    question.includes('standard') ||
    question.includes('premium') ||
    question.includes('compare')
  ) {
    return 'AcademiaOS has Starter, Standard and Premium packages. Standard is the most popular choice, while Premium includes the complete academic, transport, reporting, mobile and offline desktop experience. Prices are provided after the school submits its size and requirements.';
  }

  if (
    question.includes('demo') ||
    question.includes('trial') ||
    question.includes('test the system')
  ) {
    return 'You can request a school demo from the Packages page. Choose a package, complete the form and the AcademiaOS team will contact your school with the next steps.';
  }

  if (
    question.includes('attendance') ||
    question.includes('daily fee') ||
    question.includes('daily fees')
  ) {
    return 'AcademiaOS records learner attendance and can automatically charge daily-fee learners only for the days they are present. Unpaid balances are carried forward and accounts staff can see the live balance.';
  }

  if (
    question.includes('smart id') ||
    question.includes('id card') ||
    question.includes('qr') ||
    question.includes('scan') ||
    question.includes('gate')
  ) {
    return 'Smart ID is an optional add-on. Schools can print staff and learner ID cards, scan QR codes, verify identities at the gate and connect attendance or transport activity to each person’s record.';
  }

  if (
    question.includes('result') ||
    question.includes('marks') ||
    question.includes('academic') ||
    question.includes('proprietor approval')
  ) {
    return 'Teachers enter marks, academic administrators review them, headteachers confirm them and proprietors can give final approval. Results remain controlled until the required approval stages are completed.';
  }

  if (
    question.includes('homework') ||
    question.includes('learning material') ||
    question.includes('assignment')
  ) {
    return 'Teachers can create homework, attach learning materials, set deadlines and make the work available to learners and parents through their accounts.';
  }

  if (
    question.includes('parent') ||
    question.includes('guardian') ||
    question.includes('communication') ||
    question.includes('message')
  ) {
    return 'Parents and guardians can receive school information and view permitted attendance, fees, homework and academic records. AcademiaOS also supports secure internal communication.';
  }

  if (
    question.includes('staff') ||
    question.includes('role') ||
    question.includes('permission')
  ) {
    return 'AcademiaOS uses role-based access. Proprietors, headteachers, teachers, accounts staff, receptionists, transport staff, security staff, parents and learners only see the tools assigned to their roles.';
  }

  if (
    question.includes('transport') ||
    question.includes('bus') ||
    question.includes('vehicle')
  ) {
    return 'Transport management is available in the Premium package. It supports transport records, learner assignments and school transport oversight.';
  }

  if (
    question.includes('security') ||
    question.includes('visitor') ||
    question.includes('pickup') ||
    question.includes('pick up')
  ) {
    return 'The optional Security add-on supports gate operations, visitor records, authorised pickup processes and safer identity verification.';
  }

  if (
    question.includes('mobile') ||
    question.includes('android') ||
    question.includes('iphone') ||
    question.includes('ios')
  ) {
    return 'AcademiaOS supports mobile access for approved users. The level of mobile access depends on the selected package, with the fullest experience available under Premium.';
  }

  if (
    question.includes('desktop') ||
    question.includes('offline') ||
    question.includes('sync') ||
    question.includes('internet')
  ) {
    return 'The Premium package includes the offline desktop application. Schools can continue supported work during internet interruptions and synchronise when the connection returns.';
  }

  if (
    question.includes('report') ||
    question.includes('export') ||
    question.includes('audit') ||
    question.includes('ai') ||
    question.includes('insight')
  ) {
    return 'AcademiaOS includes school reports, exports and controlled audit records. Premium provides the most complete reporting, intelligence and oversight tools.';
  }

  if (
    question.includes('login') ||
    question.includes('sign in') ||
    question.includes('password')
  ) {
    return 'Existing AcademiaOS schools should use the School sign in button in the top navigation. Login details are issued by the school administrator or AcademiaOS team.';
  }

  if (
    question.includes('contact') ||
    question.includes('human') ||
    question.includes('call') ||
    question.includes('whatsapp') ||
    question.includes('speak')
  ) {
    return 'Choose Request pricing or Request demo on the Packages page and complete the form. The AcademiaOS team will receive your school details and contact preference.';
  }

  return 'I do not have a confirmed answer for that yet. Please use the Request pricing or Request demo form so the AcademiaOS team can respond directly to your school.';
}

export function AdepaChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'adepa',
      text: 'Akwaaba! I am Adepa, the AcademiaOS website assistant. How may I help your school today?',
    },
  ]);

  const messageAreaRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number | null>(null);

  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/pricing');

  useEffect(() => {
    messageAreaRef.current?.scrollTo({
      top: messageAreaRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  if (!isPublicPage) return null;

  function sendQuestion(question: string) {
    const cleanedQuestion = question.trim();

    if (!cleanedQuestion || typing) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'visitor',
        text: cleanedQuestion,
      },
    ]);

    setInput('');
    setTyping(true);

    replyTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'adepa',
          text: getAdepaReply(cleanedQuestion),
        },
      ]);

      setTyping(false);
    }, 550);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="fixed bottom-5 right-4 z-[90] sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="Chat with Adepa"
          className="mb-4 flex h-[min(620px,calc(100vh-120px))] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(47,29,20,0.30)]"
        >
          <header className="flex items-center justify-between bg-[#2f1d14] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9a441] text-[#2f1d14]">
                <Bot size={23} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black">Adepa</h2>
                  <Sparkles size={14} className="text-amber-300" />
                </div>

                <p className="text-xs text-white/60">
                  AcademiaOS website assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close Adepa chat"
            >
              <X size={20} />
            </button>
          </header>

          <div
            ref={messageAreaRef}
            className="flex-1 space-y-4 overflow-y-auto bg-[#f8f3eb] px-4 py-5"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'visitor'
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }
              >
                <div
                  className={
                    message.role === 'visitor'
                      ? 'max-w-[84%] rounded-2xl rounded-br-md bg-[#1f5b45] px-4 py-3 text-sm leading-6 text-white'
                      : 'max-w-[88%] rounded-2xl rounded-bl-md border border-black/5 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm'
                  }
                >
                  {message.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                  Adepa is typing…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendQuestion(question)}
                  disabled={typing}
                  className="shrink-0 rounded-full border border-[#1f5b45]/20 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-[#1f5b45] transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label htmlFor="adepa-message" className="sr-only">
                Ask Adepa a question
              </label>

              <input
                id="adepa-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Adepa about AcademiaOS…"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f5b45] focus:ring-4 focus:ring-[#1f5b45]/10"
              />

              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f5b45] text-white transition hover:bg-[#194c3a] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message to Adepa"
              >
                <Send size={18} />
              </button>
            </form>

            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-bold">
              <Link href="/features" className="text-[#1f5b45] hover:underline">
                Features
              </Link>

              <Link href="/pricing" className="text-[#1f5b45] hover:underline">
                Packages
              </Link>

              <Link
                href="/pricing#request"
                className="text-[#1f5b45] hover:underline"
              >
                Contact team
              </Link>
            </div>

            <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
              Adepa provides general product guidance and does not process
              payments.
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? 'Close Adepa chat' : 'Chat with Adepa'}
        className="ml-auto flex min-h-14 items-center gap-3 rounded-full bg-[#d9a441] px-4 text-[#2f1d14] shadow-[0_18px_45px_rgba(47,29,20,0.30)] transition hover:-translate-y-1 hover:bg-amber-400"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2f1d14] text-white">
          {open ? <X size={21} /> : <MessageCircle size={21} />}
        </span>

        <span className="hidden pr-2 text-sm font-black sm:block">
          Chat with Adepa
        </span>
      </button>
    </div>
  );
}
