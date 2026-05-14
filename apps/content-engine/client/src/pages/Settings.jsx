import { Save, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'

function ApiKeyField({ label, envKey, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        />
        <button
          onClick={() => setShow((s) => !s)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Env: <code className="bg-gray-100 px-1 rounded">{envKey}</code></p>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure API keys, schedules, and system preferences"
        action={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Save size={15} />
            Save Changes
          </button>
        }
      />

      <div className="space-y-6">
        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">API Keys</h3>
          <div className="grid grid-cols-2 gap-5">
            <ApiKeyField label="ElevenLabs API Key"          envKey="ELEVENLABS_API_KEY"       placeholder="sk-…" />
            <ApiKeyField label="WhatsApp Business Token"     envKey="WHATSAPP_TOKEN"           placeholder="EAAx…" />
            <ApiKeyField label="YouTube Data API Key"        envKey="YOUTUBE_API_KEY"          placeholder="AIza…" />
            <ApiKeyField label="MercadoLibre Access Token"   envKey="MERCADOLIBRE_TOKEN"       placeholder="APP_USR-…" />
            <ApiKeyField label="Amazon PA-API Access Key"    envKey="AMAZON_ACCESS_KEY"        placeholder="AKIA…" />
            <ApiKeyField label="Amazon PA-API Secret Key"    envKey="AMAZON_SECRET_KEY"        placeholder="…" />
            <ApiKeyField label="OpenAI API Key (LLM Agent)"  envKey="OPENAI_API_KEY"           placeholder="sk-…" />
          </div>
        </div>

        {/* Mining schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">Mining Schedule</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Daily</option>
                <option>Every 12 hours</option>
                <option>Weekly</option>
                <option>Manual only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time (UTC)</label>
              <input type="time" defaultValue="06:00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Products / Run</label>
              <input type="number" defaultValue="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Comment agent schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">Comment Agent Schedule</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cron Expression</label>
              <input type="text" defaultValue="0 */4 * * *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-400 mt-1">Every 4 hours</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Replies / Run</label>
              <input type="number" defaultValue="50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">LLM Model</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>gpt-4o-mini</option>
                <option>gpt-4o</option>
                <option>claude-3-haiku</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data retention */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">Data Retention</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catalog entries (days)</label>
              <input type="number" defaultValue="90"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Audit logs (days)</label>
              <input type="number" defaultValue="365"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
