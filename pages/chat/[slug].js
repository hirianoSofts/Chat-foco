import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAwj0vcsUbdFDwFLt3xfOHCC--OhpF6nXs",
    authDomain: "focoplataforms.firebaseapp.com",
    databaseURL: "https://focoplataforms-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "focoplataforms",
    storageBucket: "focoplataforms.firebasestorage.app",
    messagingSenderId: "363051075501",
    appId: "1:363051075501:web:3ed9f67c5b46badce34324"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// Credenciais da Groq
const GROQ_API_KEY = "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";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

export async function getServerSideProps(context) {
    const { slug } = context.params;

    try {
        const aiRef = ref(db, 'assistants/' + slug);
        const snapshot = await get(aiRef);

        if (!snapshot.exists()) {
            return { props: { error: true, slug } };
        }

        return {
            props: {
                error: false,
                assistant: snapshot.val()
            }
        };
    } catch (err) {
        return { props: { error: true, slug } };
    }
}

export default function PublicChat({ error, assistant }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (assistant && assistant.welcomeMessage) {
            setMessages([
                { role: 'assistant', content: assistant.welcomeMessage }
            ]);
        }
    }, [assistant]);

    if (error || !assistant) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>Assistente não encontrado</h2>
                    <p>O agente de IA solicitado não existe ou foi desativado.</p>
                </div>
            </div>
        );
    }

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userText = input;
        const newMessages = [...messages, { role: 'user', content: userText }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const apiMessages = [
                { role: 'system', content: assistant.systemPrompt || 'Você é um assistente útil.' },
                ...newMessages
            ];

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro na API');

            const aiReply = data.choices[0].message.content;
            setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
        } catch (err) {
            setMessages([...newMessages, { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua resposta.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>{assistant.name}</title>
                <meta name="description" content={assistant.description || 'Assistente inteligente FocoPrime'} />
                <link rel="icon" href={assistant.logoUrl || 'https://placehold.co/32x32'} />
            </Head>

            <div className="chat-container" style={{ '--primary': assistant.themeColor || '#6366f1' }}>
                <div className="chat-header">
                    <img src={assistant.logoUrl} alt="Logo" className="chat-avatar" />
                    <div className="chat-info">
                        <h2>{assistant.name}</h2>
                        <p>{assistant.description || 'Online'}</p>
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                            {msg.content}
                        </div>
                    ))}
                    {loading && <div className="message ai">Digitando...</div>}
                </div>

                <form onSubmit={sendMessage} className="chat-input-area">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="Digite sua mensagem..." 
                        className="chat-input"
                    />
                    <button type="submit" className="send-btn">
                        <i className="fi fi-rr-paper-plane"></i>
                    </button>
                </form>
            </div>

            <style jsx>{`
                :root { --primary: ${assistant.themeColor || '#6366f1'}; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'DM Sans', sans-serif; background-color: #f8fafc; height: 100vh; display: flex; justify-content: center; align-items: center; }
                .chat-container { width: 100%; max-width: 680px; height: 100vh; background: #fff; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                @media(min-width: 768px) { .chat-container { height: 85vh; border-radius: 16px; border: 1px solid #e2e8f0; } }
                .chat-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 14px; }
                .chat-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0; }
                .chat-info h2 { font-size: 16px; font-weight: 700; color: #0f172a; }
                .chat-info p { font-size: 12px; color: #64748b; }
                .chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #fafafa; }
                .message { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-break: break-word; }
                .message.ai { align-self: flex-start; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; }
                .message.user { align-self: flex-end; background: var(--primary); color: #fff; }
                .chat-input-area { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: center; background: #fff; }
                .chat-input { flex: 1; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; font-size: 14px; outline: none; }
                .chat-input:focus { border-color: var(--primary); background: #fff; }
                .send-btn { width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; }
            `}</style>
        </>
    );
}
