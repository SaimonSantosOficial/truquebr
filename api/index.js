import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://oficina.wuaze.com",
  "https://truquebr.vercel.app"
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origem não permitida pelo CORS"));
  }
}));

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/api/status", (req, res) => {
  return res.json({
    ok: true,
    message: "Backend rodando com segurança na Vercel"
  });
});

app.post("/api/pagamento/criar", async (req, res) => {
  try {
    const { valor, descricao, email, nome } = req.body;

    if (!valor || !descricao) {
      return res.status(400).json({
        error: "Valor e descrição são obrigatórios"
      });
    }

    const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
    
    if (!PAGSEGURO_TOKEN) {
      return res.status(500).json({
        error: "Token do PagSeguro não configurado no servidor"
      });
    }

    const response = await fetch("https://sandbox.api.pagseguro.com/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAGSEGURO_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        items: [{
          description: descricao,
          amount: valor,
          quantity: 1
        }],
        customer: {
          name: nome || "Cliente",
          email: email || "cliente@email.com"
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return res.json({
      ok: true,
      checkout: data
    });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    return res.status(500).json({
      error: "Erro ao processar pagamento"
    });
  }
});

app.post("/api/webhook/pagseguro", (req, res) => {
  const webhookSecret = req.headers["x-webhook-secret"];

  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({
      error: "Webhook não autorizado"
    });
  }

  const evento = req.body;
  console.log("Webhook recebido do PagSeguro:", evento);

  return res.json({
    received: true
  });
});

app.use((req, res) => {
  return res.status(404).json({
    error: "Rota não encontrada"
  });
});

export default app;
