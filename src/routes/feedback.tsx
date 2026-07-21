import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { submitFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback e Reclamações — PlacarCerto" },
      {
        name: "description",
        content:
          "Envie sugestões, reclamações ou reporte problemas para a equipe do PlacarCerto.",
      },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const send = useServerFn(submitFeedback);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<"sugestao" | "reclamacao" | "elogio" | "bug" | "outro">(
    "sugestao",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await send({ data: { name, email, category, message } });
      setSent(true);
      setMessage("");
      toast.success("Feedback enviado! Obrigado por nos ajudar a melhorar.");
    } catch (err: any) {
      const msg = err?.message || "Não foi possível enviar seu feedback. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback e observações</h1>
          <p className="text-sm text-muted-foreground">
            Sua opinião chega direto no nosso e-mail. Respondemos assim que possível.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conte pra gente</CardTitle>
          <CardDescription>
            Sugestões, reclamações, elogios ou algum bug — tudo é bem-vindo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
              ✅ Recebemos sua mensagem. Obrigado! Se você informou um e-mail, podemos
              responder por lá.
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                  Enviar outro
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome (opcional)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Como podemos te chamar?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    placeholder="voce@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sugestao">Sugestão</SelectItem>
                    <SelectItem value="reclamacao">Reclamação</SelectItem>
                    <SelectItem value="elogio">Elogio</SelectItem>
                    <SelectItem value="bug">Bug / Problema técnico</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  minLength={10}
                  maxLength={4000}
                  rows={7}
                  placeholder="Descreva sua sugestão ou o que aconteceu…"
                />
                <div className="text-right text-xs text-muted-foreground">
                  {message.length}/4000
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Enviar feedback
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
