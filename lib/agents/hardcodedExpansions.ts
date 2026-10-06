/**
 * lib/agents/hardcodedExpansions.ts — the pure hardcoded backend's knowledge base.
 *
 * Every node in the world carries a curated expansion: real entities and real
 * relationships from the AI ecosystem, written by hand. Expanding a node
 * therefore works with ZERO API keys, ZERO cost and ZERO latency — the
 * "strongest full backend" is one that never needs the network.
 *
 * Design:
 * - BY_NODE: bespoke expansions for each of the 74 world nodes.
 * - BY_TYPE: fallback pools for any future node — a deterministic slice of
 *   real entities, so every node always expands to something.
 * - Relations reuse the world's existing vocabulary
 *   (investment|partnership|supplies|employs|researches|acquired|competes|powers)
 *   with the same directional conventions.
 * - `$self` in a relation endpoint means the node being expanded.
 * - Evidence is labelled engine:'hardcoded' with the entity's official URL —
 *   never fake search results.
 */
import { dedupeEdges, dedupeNodes, normalizeName } from '../dedupe';
import type { GEdge, GNode, NodeType, Relation, Strength, World } from '../types';
import { nodeIdFor } from './evidence';

/** Relation endpoint placeholder for the node being expanded. */
export const SELF = '$self';

interface KBEntity {
  name: string;
  type: NodeType;
  description: string;
  influence: number;
  confidence: number;
  url: string;
}

interface KBRelation {
  /** Entity name or $self. */
  source: string;
  /** Entity name or $self. */
  target: string;
  relation: Relation;
  strength: Strength;
}

interface KBExpansion {
  entities: KBEntity[];
  relations: KBRelation[];
}

const E = (
  name: string,
  type: NodeType,
  description: string,
  influence: number,
  confidence: number,
  url: string,
): KBEntity => ({ name, type, description, influence, confidence, url });

const R = (source: string, target: string, relation: Relation, strength: Strength): KBRelation => ({
  source,
  target,
  relation,
  strength,
});

// ---------------------------------------------------------------------------
// Bespoke expansions — one per world node.
// ---------------------------------------------------------------------------

const BY_NODE: Record<string, KBExpansion> = {
  // --- Companies ------------------------------------------------------------
  n_openai: {
    entities: [
      E('Sam Altman', 'researcher', 'Co-founder and CEO of OpenAI; former president of Y Combinator.', 90, 92, 'https://openai.com'),
      E('Sora', 'product', "OpenAI's text-to-video generation model, released publicly in late 2024.", 78, 88, 'https://openai.com/sora'),
      E('GPT-4o', 'product', "OpenAI's flagship multimodal model, powering ChatGPT since May 2024.", 86, 90, 'https://openai.com'),
      E('Thrive Capital', 'funder', 'Venture firm that has led major OpenAI funding rounds.', 70, 80, 'https://thrivecap.com'),
    ],
    relations: [
      R(SELF, 'Sam Altman', 'employs', 'strong'),
      R(SELF, 'Sora', 'powers', 'strong'),
      R(SELF, 'GPT-4o', 'powers', 'strong'),
      R('Thrive Capital', SELF, 'investment', 'strong'),
    ],
  },
  n_nvidia: {
    entities: [
      E('Jensen Huang', 'researcher', 'Co-founder and CEO of NVIDIA; the public face of the AI compute boom.', 92, 92, 'https://www.nvidia.com'),
      E('Blackwell', 'product', "NVIDIA's flagship AI GPU architecture, successor to Hopper.", 84, 88, 'https://www.nvidia.com'),
      E('TSMC', 'company', "World's largest contract chipmaker; fabricates NVIDIA's GPUs.", 88, 90, 'https://www.tsmc.com'),
      E('H100', 'product', 'The Hopper-generation GPU that became the workhorse of LLM training.', 82, 88, 'https://www.nvidia.com'),
    ],
    relations: [
      R(SELF, 'Jensen Huang', 'employs', 'strong'),
      R('TSMC', SELF, 'supplies', 'strong'),
      R(SELF, 'Blackwell', 'powers', 'strong'),
      R(SELF, 'H100', 'powers', 'medium'),
    ],
  },
  n_google_deepmind: {
    entities: [
      E('AlphaFold', 'product', 'DeepMind system predicting protein structures; 2024 Nobel Prize in Chemistry.', 88, 92, 'https://deepmind.google/technologies/alphafold/'),
      E('Isomorphic Labs', 'startup', 'Alphabet spinout applying AI to drug discovery, founded by Demis Hassabis.', 72, 84, 'https://www.isomorphiclabs.com'),
      E('GraphCast', 'product', "DeepMind's AI weather forecasting model, beating traditional systems in 2023.", 68, 84, 'https://deepmind.google/discover/blog/graphcast-ai-model-for-faster-and-more-accurate-global-weather-forecasting/'),
    ],
    relations: [
      R(SELF, 'AlphaFold', 'powers', 'strong'),
      R(SELF, 'Isomorphic Labs', 'partnership', 'medium'),
      R(SELF, 'GraphCast', 'powers', 'medium'),
    ],
  },
  n_google: {
    entities: [
      E('Sundar Pichai', 'researcher', 'CEO of Google and Alphabet since 2015.', 88, 90, 'https://about.google'),
      E('Waymo', 'company', "Alphabet's autonomous driving subsidiary.", 76, 86, 'https://waymo.com'),
      E('TPU', 'product', "Google's custom Tensor Processing Unit chips for AI workloads.", 80, 88, 'https://cloud.google.com/tpu'),
    ],
    relations: [
      R(SELF, 'Sundar Pichai', 'employs', 'strong'),
      R(SELF, 'Waymo', 'partnership', 'medium'),
      R(SELF, 'TPU', 'powers', 'strong'),
    ],
  },
  n_microsoft: {
    entities: [
      E('Satya Nadella', 'researcher', 'CEO of Microsoft; architect of its cloud-first and AI strategy.', 90, 92, 'https://www.microsoft.com'),
      E('Azure', 'product', "Microsoft's cloud platform and the exclusive cloud provider for OpenAI.", 86, 90, 'https://azure.microsoft.com'),
      E('LinkedIn', 'company', 'Professional network owned by Microsoft since 2016.', 72, 86, 'https://www.linkedin.com'),
    ],
    relations: [
      R(SELF, 'Satya Nadella', 'employs', 'strong'),
      R(SELF, 'Azure', 'powers', 'strong'),
      R(SELF, 'LinkedIn', 'acquired', 'strong'),
    ],
  },
  n_anthropic: {
    entities: [
      E('Daniela Amodei', 'researcher', 'Co-founder and president of Anthropic.', 82, 86, 'https://www.anthropic.com'),
      E('Chris Olah', 'researcher', 'Co-founder of Anthropic; interpretability research lead.', 78, 84, 'https://www.anthropic.com'),
      E('Claude Code', 'product', "Anthropic's agentic coding assistant, launched 2025.", 74, 84, 'https://www.anthropic.com/claude-code'),
    ],
    relations: [
      R(SELF, 'Daniela Amodei', 'employs', 'strong'),
      R(SELF, 'Chris Olah', 'employs', 'strong'),
      R(SELF, 'Claude Code', 'powers', 'medium'),
    ],
  },
  n_meta: {
    entities: [
      E('Mark Zuckerberg', 'researcher', 'Co-founder and CEO of Meta.', 90, 92, 'https://about.meta.com'),
      E('Llama', 'product', "Meta's family of open-weight large language models.", 86, 90, 'https://www.llama.com'),
      E('PyTorch', 'technology', 'Open-source ML framework originally created at Meta.', 84, 90, 'https://pytorch.org'),
    ],
    relations: [
      R(SELF, 'Mark Zuckerberg', 'employs', 'strong'),
      R(SELF, 'Llama', 'powers', 'strong'),
      R(SELF, 'PyTorch', 'powers', 'medium'),
    ],
  },
  n_amazon: {
    entities: [
      E('Andy Jassy', 'researcher', 'CEO of Amazon; former AWS chief.', 84, 88, 'https://www.amazon.com'),
      E('AWS', 'product', "Amazon's cloud division; major Anthropic partner and investor.", 88, 90, 'https://aws.amazon.com'),
      E('Alexa', 'product', "Amazon's voice assistant, rebuilt on LLMs as Alexa+.", 70, 84, 'https://www.amazon.com'),
    ],
    relations: [
      R(SELF, 'Andy Jassy', 'employs', 'strong'),
      R(SELF, 'AWS', 'powers', 'strong'),
      R(SELF, 'Alexa', 'powers', 'medium'),
    ],
  },
  n_xai: {
    entities: [
      E('Elon Musk', 'researcher', 'Founder of xAI; CEO of Tesla, SpaceX and X.', 92, 92, 'https://x.ai'),
      E('Grok', 'product', "xAI's conversational AI, integrated into the X platform.", 80, 88, 'https://x.ai'),
      E('Colossus', 'product', 'xAI supercomputer cluster in Memphis, among the largest in the world.', 76, 84, 'https://x.ai'),
    ],
    relations: [
      R(SELF, 'Elon Musk', 'employs', 'strong'),
      R(SELF, 'Grok', 'powers', 'strong'),
      R(SELF, 'Colossus', 'powers', 'medium'),
    ],
  },
  n_mistral_ai: {
    entities: [
      E('Arthur Mensch', 'researcher', 'Co-founder and CEO of Mistral AI; former DeepMind scientist.', 78, 86, 'https://mistral.ai'),
      E('Mixtral', 'product', "Mistral's open-weight mixture-of-experts model family.", 74, 84, 'https://mistral.ai'),
      E('Mistral Large', 'product', "Mistral's flagship large language model.", 72, 82, 'https://mistral.ai'),
    ],
    relations: [
      R(SELF, 'Arthur Mensch', 'employs', 'strong'),
      R(SELF, 'Mixtral', 'powers', 'strong'),
      R(SELF, 'Mistral Large', 'powers', 'medium'),
    ],
  },

  // --- Startups -------------------------------------------------------------
  n_hugging_face: {
    entities: [
      E('Clem Delangue', 'researcher', 'Co-founder and CEO of Hugging Face.', 80, 86, 'https://huggingface.co'),
      E('Transformers Library', 'product', "Hugging Face's open-source library that standardized model sharing.", 84, 90, 'https://huggingface.co/docs/transformers'),
    ],
    relations: [
      R(SELF, 'Clem Delangue', 'employs', 'strong'),
      R(SELF, 'Transformers Library', 'powers', 'strong'),
    ],
  },
  n_perplexity_ai: {
    entities: [
      E('Aravind Srinivas', 'researcher', 'Co-founder and CEO of Perplexity AI.', 78, 86, 'https://www.perplexity.ai'),
      E('Comet', 'product', "Perplexity's agentic AI web browser, launched 2025.", 70, 82, 'https://www.perplexity.ai'),
    ],
    relations: [
      R(SELF, 'Aravind Srinivas', 'employs', 'strong'),
      R(SELF, 'Comet', 'powers', 'medium'),
    ],
  },
  n_runway: {
    entities: [
      E('Cristobal Valenzuela', 'researcher', 'Co-founder and CEO of Runway.', 72, 82, 'https://runwayml.com'),
      E('Gen-3 Alpha', 'product', "Runway's video generation model family.", 74, 84, 'https://runwayml.com'),
    ],
    relations: [
      R(SELF, 'Cristobal Valenzuela', 'employs', 'strong'),
      R(SELF, 'Gen-3 Alpha', 'powers', 'strong'),
    ],
  },
  n_cohere: {
    entities: [
      E('Aidan Gomez', 'researcher', 'Co-founder and CEO of Cohere; co-author of Attention Is All You Need.', 80, 88, 'https://cohere.com'),
      E('Command R', 'product', "Cohere's enterprise RAG-optimized language model.", 72, 84, 'https://cohere.com'),
    ],
    relations: [
      R(SELF, 'Aidan Gomez', 'employs', 'strong'),
      R(SELF, 'Command R', 'powers', 'strong'),
    ],
  },
  n_stability_ai: {
    entities: [
      E('Emad Mostaque', 'researcher', 'Founder of Stability AI.', 74, 84, 'https://stability.ai'),
      E('Stable Audio', 'product', "Stability AI's music and sound generation model.", 66, 80, 'https://stability.ai'),
    ],
    relations: [
      R(SELF, 'Emad Mostaque', 'employs', 'medium'),
      R(SELF, 'Stable Audio', 'powers', 'medium'),
    ],
  },
  n_character_ai: {
    entities: [
      E('Noam Shazeer', 'researcher', 'Co-founder of Character.AI; co-author of Attention Is All You Need.', 80, 88, 'https://character.ai'),
    ],
    relations: [
      R(SELF, 'Noam Shazeer', 'employs', 'medium'),
      R('Google', SELF, 'partnership', 'strong'),
    ],
  },

  // --- Funders --------------------------------------------------------------
  n_sequoia_capital: {
    entities: [
      E('Roelof Botha', 'researcher', 'Managing partner of Sequoia Capital.', 78, 86, 'https://www.sequoiacap.com'),
      E('Stripe', 'company', 'Payments company backed by Sequoia since its early rounds.', 84, 90, 'https://stripe.com'),
    ],
    relations: [
      R(SELF, 'Roelof Botha', 'employs', 'strong'),
      R(SELF, 'Stripe', 'investment', 'strong'),
    ],
  },
  n_andreessen_horowitz: {
    entities: [
      E('Marc Andreessen', 'researcher', 'Co-founder of Andreessen Horowitz; co-author of Mosaic.', 86, 90, 'https://a16z.com'),
      E('Ben Horowitz', 'researcher', 'Co-founder of Andreessen Horowitz.', 82, 86, 'https://a16z.com'),
    ],
    relations: [
      R(SELF, 'Marc Andreessen', 'employs', 'strong'),
      R(SELF, 'Ben Horowitz', 'employs', 'strong'),
    ],
  },
  n_softbank_vision_fund: {
    entities: [
      E('Masayoshi Son', 'researcher', 'Founder of SoftBank Group and its Vision Funds.', 86, 90, 'https://group.softbank'),
      E('Arm', 'company', 'Chip designer majority-owned by SoftBank; its IP ships in most smartphones.', 82, 88, 'https://www.arm.com'),
    ],
    relations: [
      R(SELF, 'Masayoshi Son', 'employs', 'strong'),
      R(SELF, 'Arm', 'investment', 'strong'),
    ],
  },
  n_y_combinator: {
    entities: [
      E('Garry Tan', 'researcher', 'President and CEO of Y Combinator.', 76, 84, 'https://www.ycombinator.com'),
      E('Airbnb', 'company', 'Home-sharing company; Y Combinator Winter 2009.', 80, 88, 'https://www.airbnb.com'),
      E('Dropbox', 'company', 'File hosting company; Y Combinator Summer 2007.', 74, 84, 'https://www.dropbox.com'),
    ],
    relations: [
      R(SELF, 'Garry Tan', 'employs', 'strong'),
      R(SELF, 'Airbnb', 'investment', 'medium'),
      R(SELF, 'Dropbox', 'investment', 'medium'),
    ],
  },

  // --- Researchers ----------------------------------------------------------
  n_geoffrey_hinton: {
    entities: [
      E('Alex Krizhevsky', 'researcher', 'Co-author of AlexNet; student of Hinton.', 76, 84, 'https://en.wikipedia.org/wiki/Alex_Krizhevsky'),
      E('Nobel Prize 2024', 'event', 'Hinton shared the 2024 Nobel Prize in Physics for neural network foundations.', 80, 90, 'https://www.nobelprize.org'),
    ],
    relations: [
      R(SELF, 'Alex Krizhevsky', 'partnership', 'strong'),
      R(SELF, 'Nobel Prize 2024', 'partnership', 'strong'),
    ],
  },
  n_demis_hassabis: {
    entities: [
      E('Nobel Prize 2024', 'event', 'Hassabis shared the 2024 Nobel Prize in Chemistry for AlphaFold.', 80, 90, 'https://www.nobelprize.org'),
      E('Shane Legg', 'researcher', 'Co-founder of DeepMind.', 72, 82, 'https://en.wikipedia.org/wiki/Shane_Legg'),
    ],
    relations: [
      R(SELF, 'Nobel Prize 2024', 'partnership', 'strong'),
      R(SELF, 'Shane Legg', 'partnership', 'medium'),
    ],
  },
  n_ilya_sutskever: {
    entities: [
      E('Safe Superintelligence', 'startup', 'AI lab founded by Sutskever in 2024 after leaving OpenAI.', 78, 86, 'https://ssi.inc'),
      E('Alex Krizhevsky', 'researcher', 'Co-author of AlexNet alongside Sutskever.', 76, 84, 'https://en.wikipedia.org/wiki/Alex_Krizhevsky'),
    ],
    relations: [
      R(SELF, 'Safe Superintelligence', 'partnership', 'strong'),
      R(SELF, 'Alex Krizhevsky', 'partnership', 'medium'),
    ],
  },
  n_yann_lecun: {
    entities: [
      E('PyTorch', 'technology', 'ML framework closely associated with LeCun-led FAIR research.', 84, 90, 'https://pytorch.org'),
      E('LeNet', 'technology', 'Pioneering convolutional network architecture from LeCun (1989).', 70, 84, 'https://en.wikipedia.org/wiki/LeNet'),
    ],
    relations: [
      R(SELF, 'PyTorch', 'researches', 'strong'),
      R(SELF, 'LeNet', 'researches', 'strong'),
    ],
  },
  n_dario_amodei: {
    entities: [
      E('Daniela Amodei', 'researcher', 'Co-founder and president of Anthropic; sister of Dario.', 82, 86, 'https://www.anthropic.com'),
    ],
    relations: [R(SELF, 'Daniela Amodei', 'partnership', 'strong')],
  },
  n_fei_fei_li: {
    entities: [
      E('World Labs', 'startup', 'Spatial-intelligence startup founded by Fei-Fei Li in 2024.', 74, 84, 'https://www.worldlabs.ai'),
      E('ImageNet', 'technology', 'Landmark image dataset created by Fei-Fei Li; enabled the deep learning boom.', 82, 90, 'https://www.image-net.org'),
    ],
    relations: [
      R(SELF, 'World Labs', 'partnership', 'strong'),
      R(SELF, 'ImageNet', 'researches', 'strong'),
    ],
  },
  n_yoshua_bengio: {
    entities: [
      E('Mila', 'university', 'Quebec AI institute founded by Bengio.', 76, 86, 'https://mila.quebec'),
    ],
    relations: [R(SELF, 'Mila', 'partnership', 'strong')],
  },
  n_andrej_karpathy: {
    entities: [
      E('Eureka Labs', 'startup', 'AI education company founded by Karpathy in 2024.', 70, 82, 'https://eurekalabs.ai'),
      E('nanoGPT', 'product', 'Popular minimal GPT training codebase by Karpathy.', 68, 84, 'https://github.com/karpathy/nanoGPT'),
    ],
    relations: [
      R(SELF, 'Eureka Labs', 'partnership', 'strong'),
      R(SELF, 'nanoGPT', 'powers', 'medium'),
    ],
  },

  // --- Products -------------------------------------------------------------
  n_chatgpt: {
    entities: [
      E('GPT-4o', 'product', "OpenAI's flagship multimodal model behind ChatGPT.", 86, 90, 'https://openai.com'),
      E('Sora', 'product', "OpenAI's text-to-video model, reachable from inside ChatGPT.", 78, 88, 'https://openai.com/sora'),
    ],
    relations: [
      R('OpenAI', SELF, 'powers', 'strong'),
      R(SELF, 'GPT-4o', 'powers', 'strong'),
      R(SELF, 'Sora', 'partnership', 'medium'),
    ],
  },
  n_claude: {
    entities: [
      E('Claude Code', 'product', "Anthropic's agentic coding assistant.", 74, 84, 'https://www.anthropic.com/claude-code'),
    ],
    relations: [
      R('Anthropic', SELF, 'powers', 'strong'),
      R(SELF, 'Claude Code', 'partnership', 'medium'),
    ],
  },
  n_gemini: {
    entities: [
      E('Project Astra', 'product', "Google DeepMind's real-time multimodal AI assistant project.", 72, 84, 'https://deepmind.google/technologies/project-astra/'),
      E('NotebookLM', 'product', "Google's AI note-taking and research assistant.", 70, 84, 'https://notebooklm.google'),
    ],
    relations: [
      R('Google', SELF, 'powers', 'strong'),
      R(SELF, 'Project Astra', 'partnership', 'medium'),
      R(SELF, 'NotebookLM', 'partnership', 'medium'),
    ],
  },
  n_gpt3: {
    entities: [
      E('InstructGPT', 'product', 'Instruction-tuned GPT-3 variant; the direct precursor to ChatGPT.', 76, 86, 'https://openai.com'),
    ],
    relations: [
      R('OpenAI', SELF, 'powers', 'strong'),
      R(SELF, 'InstructGPT', 'partnership', 'strong'),
    ],
  },
  n_dall_e: {
    entities: [
      E('DALL-E 3', 'product', "OpenAI's third-generation image model, built into ChatGPT.", 76, 86, 'https://openai.com/dall-e-3'),
    ],
    relations: [
      R('OpenAI', SELF, 'powers', 'strong'),
      R(SELF, 'DALL-E 3', 'partnership', 'strong'),
    ],
  },
  n_stable_diffusion: {
    entities: [
      E('Emad Mostaque', 'researcher', 'Founder of Stability AI.', 74, 84, 'https://stability.ai'),
    ],
    relations: [
      R('Stability AI', SELF, 'powers', 'strong'),
      R(SELF, 'Emad Mostaque', 'partnership', 'medium'),
    ],
  },
  n_midjourney: {
    entities: [
      E('David Holz', 'researcher', 'Founder of Midjourney; formerly NASA and Leap Motion.', 76, 84, 'https://www.midjourney.com'),
    ],
    relations: [R(SELF, 'David Holz', 'employs', 'strong')],
  },
  n_github_copilot: {
    entities: [
      E('GitHub', 'company', 'Microsoft-owned code hosting platform; co-developer of Copilot.', 84, 90, 'https://github.com'),
    ],
    relations: [
      R('GitHub', SELF, 'partnership', 'strong'),
      R('Microsoft', SELF, 'powers', 'medium'),
    ],
  },

  // --- Technologies ---------------------------------------------------------
  n_transformer: {
    entities: [
      E('Vision Transformer', 'paper', '"An Image is Worth 16x16 Words" — transformers for vision (2020).', 78, 88, 'https://arxiv.org/abs/2010.11929'),
      E('FlashAttention', 'technology', 'IO-aware exact attention; the standard for long-context training.', 76, 86, 'https://github.com/Dao-AILab/flash-attention'),
    ],
    relations: [
      R(SELF, 'Vision Transformer', 'partnership', 'medium'),
      R(SELF, 'FlashAttention', 'partnership', 'strong'),
    ],
  },
  n_cuda: {
    entities: [
      E('cuDNN', 'technology', "NVIDIA's deep neural network GPU-acceleration library.", 76, 86, 'https://developer.nvidia.com/cudnn'),
      E('TensorRT', 'technology', "NVIDIA's inference optimization SDK.", 72, 84, 'https://developer.nvidia.com/tensorrt'),
    ],
    relations: [
      R('NVIDIA', SELF, 'powers', 'strong'),
      R(SELF, 'cuDNN', 'partnership', 'strong'),
      R(SELF, 'TensorRT', 'partnership', 'medium'),
    ],
  },
  n_large_language_models: {
    entities: [
      E('Scaling Laws', 'paper', 'Kaplan et al. (2020): predictable power-law scaling of language models.', 80, 90, 'https://arxiv.org/abs/2001.08361'),
      E('Chinchilla', 'paper', "DeepMind's compute-optimal scaling study (2022).", 78, 88, 'https://arxiv.org/abs/2203.15556'),
    ],
    relations: [
      R(SELF, 'Scaling Laws', 'partnership', 'strong'),
      R(SELF, 'Chinchilla', 'partnership', 'medium'),
    ],
  },
  n_rlhf: {
    entities: [
      E('InstructGPT Paper', 'paper', '"Training language models to follow instructions with human feedback" (2022).', 80, 90, 'https://arxiv.org/abs/2203.02155'),
      E('DPO', 'paper', 'Direct Preference Optimization — a simpler RLHF alternative (2023).', 74, 86, 'https://arxiv.org/abs/2305.18290'),
    ],
    relations: [
      R(SELF, 'InstructGPT Paper', 'partnership', 'strong'),
      R(SELF, 'DPO', 'partnership', 'medium'),
    ],
  },
  n_diffusion_models: {
    entities: [
      E('Imagen', 'product', "Google's photorealistic text-to-image model.", 72, 84, 'https://imagen.research.google'),
    ],
    relations: [
      R('Google', SELF, 'powers', 'medium'),
      R(SELF, 'Imagen', 'partnership', 'medium'),
    ],
  },
  n_multimodal_ai: {
    entities: [
      E('CLIP', 'paper', "OpenAI's contrastive image-text model (2021); backbone of multimodal AI.", 80, 90, 'https://arxiv.org/abs/2103.00020'),
      E('Flamingo', 'paper', "DeepMind's few-shot visual language model (2022).", 74, 86, 'https://arxiv.org/abs/2204.14198'),
    ],
    relations: [
      R(SELF, 'CLIP', 'partnership', 'strong'),
      R(SELF, 'Flamingo', 'partnership', 'medium'),
    ],
  },
  n_ai_agents: {
    entities: [
      E('AutoGPT', 'product', 'Viral 2023 open-source autonomous agent experiment.', 68, 82, 'https://github.com/Significant-Gravitas/AutoGPT'),
      E('Devin', 'product', 'Autonomous software-engineer agent by Cognition (2024).', 72, 84, 'https://www.cognition.ai'),
    ],
    relations: [
      R(SELF, 'AutoGPT', 'partnership', 'medium'),
      R(SELF, 'Devin', 'partnership', 'medium'),
    ],
  },
  n_retrieval_augmented_generation: {
    entities: [
      E('RAG by Lewis et al.', 'paper', '"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020).', 76, 88, 'https://arxiv.org/abs/2005.11401'),
    ],
    relations: [R(SELF, 'RAG by Lewis et al.', 'partnership', 'strong')],
  },

  // --- Papers ---------------------------------------------------------------
  n_attention_is_all_you_need: {
    entities: [
      E('Ashish Vaswani', 'researcher', 'First author of Attention Is All You Need.', 80, 88, 'https://en.wikipedia.org/wiki/Attention_Is_All_You_Need'),
      E('NIPS 2017', 'event', 'Conference where the Transformer paper was published.', 74, 86, 'https://nips.cc'),
    ],
    relations: [
      R('Ashish Vaswani', SELF, 'researches', 'strong'),
      R(SELF, 'NIPS 2017', 'partnership', 'medium'),
    ],
  },
  n_alexnet: {
    entities: [
      E('Alex Krizhevsky', 'researcher', 'First author of AlexNet.', 76, 84, 'https://en.wikipedia.org/wiki/Alex_Krizhevsky'),
      E('ImageNet', 'technology', 'Dataset behind the ImageNet challenge that AlexNet won.', 82, 90, 'https://www.image-net.org'),
    ],
    relations: [
      R('Alex Krizhevsky', SELF, 'researches', 'strong'),
      R(SELF, 'ImageNet', 'partnership', 'strong'),
    ],
  },
  n_gpt3_paper: {
    entities: [
      E('Tom Brown', 'researcher', 'Lead author of the GPT-3 paper.', 76, 86, 'https://arxiv.org/abs/2005.14165'),
      E('NeurIPS 2020', 'event', 'Conference where the GPT-3 paper was published.', 72, 84, 'https://neurips.cc'),
    ],
    relations: [
      R('Tom Brown', SELF, 'researches', 'strong'),
      R(SELF, 'NeurIPS 2020', 'partnership', 'medium'),
    ],
  },
  n_bert_paper: {
    entities: [
      E('Jacob Devlin', 'researcher', 'Lead author of BERT.', 76, 86, 'https://arxiv.org/abs/1810.04805'),
    ],
    relations: [R('Jacob Devlin', SELF, 'researches', 'strong')],
  },
  n_ddpm: {
    entities: [
      E('Jonathan Ho', 'researcher', 'First author of DDPM.', 74, 84, 'https://arxiv.org/abs/2006.11239'),
      E('NeurIPS 2020', 'event', 'Conference where DDPM was published.', 72, 84, 'https://neurips.cc'),
    ],
    relations: [
      R('Jonathan Ho', SELF, 'researches', 'strong'),
      R(SELF, 'NeurIPS 2020', 'partnership', 'medium'),
    ],
  },
  n_constitutional_ai: {
    entities: [
      E('Yuntao Bai', 'researcher', 'First author of the Constitutional AI paper.', 72, 82, 'https://arxiv.org/abs/2212.08073'),
    ],
    relations: [R('Yuntao Bai', SELF, 'researches', 'strong')],
  },

  // --- Events ---------------------------------------------------------------
  n_chatgpt_launch: {
    entities: [
      E('Bing Chat', 'product', "Microsoft's ChatGPT-powered search chat, launched February 2023.", 70, 84, 'https://www.bing.com/chat'),
      E('Google Bard', 'product', "Google's ChatGPT rival, launched March 2023 and later renamed Gemini.", 72, 86, 'https://en.wikipedia.org/wiki/Gemini_(chatbot)'),
    ],
    relations: [
      R(SELF, 'Bing Chat', 'partnership', 'medium'),
      R(SELF, 'Google Bard', 'partnership', 'medium'),
    ],
  },
  n_gpt4_launch: {
    entities: [
      E('Khan Academy', 'company', 'Education nonprofit; GPT-4 launch partner with the Khanmigo tutor.', 70, 84, 'https://www.khanacademy.org'),
    ],
    relations: [R(SELF, 'Khan Academy', 'partnership', 'medium')],
  },
  n_alphago_match: {
    entities: [
      E('Lee Sedol', 'researcher', 'Go legend defeated by AlphaGo in 2016.', 78, 88, 'https://en.wikipedia.org/wiki/Lee_Sedol'),
      E('Fan Hui', 'researcher', 'European Go champion; first professional beaten by AlphaGo (2015).', 68, 82, 'https://en.wikipedia.org/wiki/Fan_Hui'),
    ],
    relations: [
      R(SELF, 'Lee Sedol', 'partnership', 'strong'),
      R(SELF, 'Fan Hui', 'partnership', 'medium'),
    ],
  },
  n_openai_board_crisis: {
    entities: [
      E('Sam Altman', 'researcher', 'Briefly ousted as OpenAI CEO in November 2023, then reinstated.', 90, 92, 'https://openai.com'),
      E('Mira Murati', 'researcher', 'Former OpenAI CTO; briefly interim CEO during the crisis.', 78, 86, 'https://en.wikipedia.org/wiki/Mira_Murati'),
    ],
    relations: [
      R(SELF, 'Sam Altman', 'partnership', 'strong'),
      R(SELF, 'Mira Murati', 'partnership', 'medium'),
    ],
  },
  n_bletchley_ai_safety_summit: {
    entities: [
      E('Rishi Sunak', 'researcher', 'UK Prime Minister who hosted the 2023 summit.', 72, 84, 'https://en.wikipedia.org/wiki/Rishi_Sunak'),
    ],
    relations: [
      R('UK Government', SELF, 'partnership', 'strong'),
      R(SELF, 'Rishi Sunak', 'partnership', 'medium'),
    ],
  },

  // --- Universities ---------------------------------------------------------
  n_stanford_university: {
    entities: [
      E('Andrew Ng', 'researcher', 'Stanford professor; co-founder of Coursera and Google Brain.', 86, 90, 'https://www.andrewng.org'),
      E('Christopher Manning', 'researcher', 'Stanford NLP pioneer.', 76, 86, 'https://nlp.stanford.edu/manning/'),
    ],
    relations: [
      R(SELF, 'Andrew Ng', 'employs', 'strong'),
      R(SELF, 'Christopher Manning', 'employs', 'medium'),
    ],
  },
  n_mit: {
    entities: [
      E('Daniela Rus', 'researcher', 'Director of MIT CSAIL.', 76, 86, 'https://www.csail.mit.edu'),
      E('Lex Fridman', 'researcher', 'MIT research scientist and popular AI podcaster.', 74, 84, 'https://lexfridman.com'),
    ],
    relations: [
      R(SELF, 'Daniela Rus', 'employs', 'strong'),
      R(SELF, 'Lex Fridman', 'employs', 'medium'),
    ],
  },
  n_uc_berkeley: {
    entities: [
      E('Stuart Russell', 'researcher', 'Berkeley AI professor; co-author of the standard AI textbook.', 80, 88, 'https://people.eecs.berkeley.edu/~russell/'),
      E('Pieter Abbeel', 'researcher', 'Berkeley robotics and reinforcement learning professor.', 76, 86, 'https://people.eecs.berkeley.edu/~pabbeel/'),
    ],
    relations: [
      R(SELF, 'Stuart Russell', 'employs', 'strong'),
      R(SELF, 'Pieter Abbeel', 'employs', 'medium'),
    ],
  },
  n_university_of_toronto: {
    entities: [
      E('Richard Zemel', 'researcher', 'Toronto ML professor; Vector Institute co-founder.', 70, 82, 'https://www.cs.toronto.edu/~zemel/'),
    ],
    relations: [R(SELF, 'Richard Zemel', 'employs', 'medium')],
  },

  // --- Countries ------------------------------------------------------------
  n_usa: {
    entities: [
      E('NIST', 'government', 'US standards agency writing AI risk management frameworks.', 76, 86, 'https://www.nist.gov'),
      E('CHIPS Act', 'law', '2022 US law funding domestic semiconductor manufacturing.', 74, 86, 'https://www.whitehouse.gov'),
    ],
    relations: [
      R(SELF, 'NIST', 'partnership', 'strong'),
      R(SELF, 'CHIPS Act', 'partnership', 'medium'),
    ],
  },
  n_china: {
    entities: [
      E('Baidu', 'company', "China's leading search company; maker of the Ernie Bot LLM.", 78, 88, 'https://www.baidu.com'),
      E('DeepSeek', 'startup', 'Chinese AI lab whose R1 model shocked global markets in early 2025.', 82, 88, 'https://www.deepseek.com'),
    ],
    relations: [
      R(SELF, 'Baidu', 'partnership', 'strong'),
      R(SELF, 'DeepSeek', 'partnership', 'strong'),
    ],
  },
  n_united_kingdom: {
    entities: [
      E('Alan Turing Institute', 'university', "The UK's national institute for AI and data science.", 70, 84, 'https://www.turing.ac.uk'),
    ],
    relations: [R(SELF, 'Alan Turing Institute', 'partnership', 'strong')],
  },

  // --- Governments ----------------------------------------------------------
  n_us_government: {
    entities: [
      E('NIST', 'government', 'Developed the AI Risk Management Framework under federal direction.', 76, 86, 'https://www.nist.gov'),
      E('DARPA', 'government', 'Defense research agency funding foundational AI programs.', 78, 88, 'https://www.darpa.mil'),
    ],
    relations: [
      R(SELF, 'NIST', 'partnership', 'strong'),
      R(SELF, 'DARPA', 'partnership', 'medium'),
    ],
  },
  n_european_commission: {
    entities: [
      E('Margrethe Vestager', 'researcher', 'EU competition chief behind landmark tech regulation.', 74, 84, 'https://commission.europa.eu'),
      E('Digital Markets Act', 'law', 'EU law curbing Big Tech platform power (2022).', 72, 84, 'https://digital-markets-act.ec.europa.eu'),
    ],
    relations: [
      R(SELF, 'Margrethe Vestager', 'employs', 'medium'),
      R(SELF, 'Digital Markets Act', 'partnership', 'strong'),
    ],
  },
  n_uk_government: {
    entities: [
      E('Rishi Sunak', 'researcher', 'UK Prime Minister during the AI Safety Summit era.', 72, 84, 'https://en.wikipedia.org/wiki/Rishi_Sunak'),
    ],
    relations: [R(SELF, 'Rishi Sunak', 'employs', 'medium')],
  },

  // --- Laws -----------------------------------------------------------------
  n_eu_ai_act: {
    entities: [
      E('GDPR', 'law', "EU data protection law; the template for the AI Act's risk-based approach.", 80, 90, 'https://gdpr.eu'),
      E('AI Office', 'government', 'EU body enforcing the AI Act.', 68, 82, 'https://digital-strategy.ec.europa.eu/en/policies/ai-office'),
    ],
    relations: [
      R(SELF, 'GDPR', 'partnership', 'medium'),
      R(SELF, 'AI Office', 'partnership', 'strong'),
    ],
  },
  n_us_ai_executive_order: {
    entities: [
      E('Joe Biden', 'researcher', 'US President who signed EO 14110 on AI safety in 2023.', 78, 86, 'https://www.whitehouse.gov'),
      E('NIST', 'government', 'Tasked by the order with AI red-teaming guidelines.', 76, 86, 'https://www.nist.gov'),
    ],
    relations: [
      R(SELF, 'Joe Biden', 'partnership', 'strong'),
      R(SELF, 'NIST', 'partnership', 'medium'),
    ],
  },
  n_china_generative_ai_measures: {
    entities: [
      E('CAC', 'government', 'Cyberspace Administration of China; enforces the measures.', 72, 84, 'https://en.wikipedia.org/wiki/Cyberspace_Administration_of_China'),
    ],
    relations: [R(SELF, 'CAC', 'partnership', 'strong')],
  },

  // --- Jobs -----------------------------------------------------------------
  n_ml_engineer: {
    entities: [
      E('PyTorch', 'technology', 'The dominant framework for ML engineering roles.', 84, 90, 'https://pytorch.org'),
      E('Kaggle', 'product', 'Competition platform central to ML hiring pipelines.', 70, 84, 'https://www.kaggle.com'),
    ],
    relations: [
      R(SELF, 'PyTorch', 'partnership', 'strong'),
      R(SELF, 'Kaggle', 'partnership', 'medium'),
    ],
  },
  n_ai_safety_researcher: {
    entities: [
      E('Paul Christiano', 'researcher', 'Alignment researcher; former OpenAI safety lead.', 76, 86, 'https://paulfchristiano.com'),
      E('MIRI', 'startup', 'Machine Intelligence Research Institute; early AI safety nonprofit.', 68, 82, 'https://intelligence.org'),
    ],
    relations: [
      R(SELF, 'Paul Christiano', 'partnership', 'medium'),
      R(SELF, 'MIRI', 'partnership', 'medium'),
    ],
  },
  n_data_scientist: {
    entities: [
      E('pandas', 'technology', 'The foundational Python data-analysis library.', 76, 88, 'https://pandas.pydata.org'),
      E('Jupyter', 'product', 'The notebook environment of working data scientists.', 74, 86, 'https://jupyter.org'),
    ],
    relations: [
      R(SELF, 'pandas', 'partnership', 'strong'),
      R(SELF, 'Jupyter', 'partnership', 'medium'),
    ],
  },
  n_prompt_engineer: {
    entities: [
      E('LangChain', 'product', 'Framework for building LLM applications; core prompt-engineering tooling.', 72, 84, 'https://www.langchain.com'),
    ],
    relations: [R(SELF, 'LangChain', 'partnership', 'strong')],
  },

  // --- Patents --------------------------------------------------------------
  n_google_transformer_patent: {
    entities: [
      E('USPTO', 'government', 'US Patent and Trademark Office.', 70, 84, 'https://www.uspto.gov'),
    ],
    relations: [R(SELF, 'USPTO', 'partnership', 'medium')],
  },
  n_deepmind_alphago_patent: {
    entities: [
      E('EPO', 'government', 'European Patent Office.', 68, 82, 'https://www.epo.org'),
    ],
    relations: [R(SELF, 'EPO', 'partnership', 'medium')],
  },
};

// ---------------------------------------------------------------------------
// Fallback pools — deterministic slices for any node without a bespoke entry
// (e.g. nodes grafted later). `dir: 'in'` means entity -> $self,
// `dir: 'out'` means $self -> entity.
// ---------------------------------------------------------------------------

interface PoolEntry extends KBEntity {
  relation: Relation;
  strength: Strength;
  dir: 'in' | 'out';
}

const P = (
  name: string,
  type: NodeType,
  description: string,
  influence: number,
  confidence: number,
  url: string,
  relation: Relation,
  strength: Strength,
  dir: 'in' | 'out',
): PoolEntry => ({ name, type, description, influence, confidence, url, relation, strength, dir });

const BY_TYPE: Record<NodeType, PoolEntry[]> = {
  company: [
    P('TSMC', 'company', "World's largest contract chipmaker.", 88, 90, 'https://www.tsmc.com', 'supplies', 'strong', 'in'),
    P('Intel', 'company', 'Chipmaker racing to reclaim AI relevance.', 76, 88, 'https://www.intel.com', 'competes', 'medium', 'in'),
    P('Adobe', 'company', 'Creative software giant betting on generative AI.', 74, 86, 'https://www.adobe.com', 'partnership', 'medium', 'in'),
    P('Salesforce', 'company', 'CRM leader embedding AI agents across its platform.', 74, 86, 'https://www.salesforce.com', 'partnership', 'medium', 'in'),
    P('Oracle', 'company', 'Database and cloud vendor expanding AI infrastructure.', 72, 84, 'https://www.oracle.com', 'competes', 'medium', 'in'),
  ],
  startup: [
    P('DeepSeek', 'startup', 'Chinese AI lab behind the R1 reasoning model.', 82, 88, 'https://www.deepseek.com', 'competes', 'strong', 'in'),
    P('World Labs', 'startup', 'Fei-Fei Li’s spatial-intelligence startup.', 74, 84, 'https://www.worldlabs.ai', 'competes', 'medium', 'in'),
    P('Safe Superintelligence', 'startup', 'Ilya Sutskever’s 2024 AI lab.', 78, 86, 'https://ssi.inc', 'competes', 'medium', 'in'),
    P('Khosla Ventures', 'funder', 'Early backer of OpenAI and many AI startups.', 76, 86, 'https://www.khoslaventures.com', 'investment', 'strong', 'in'),
  ],
  funder: [
    P('Stripe', 'company', 'Payments company; frequent VC co-investment target.', 84, 90, 'https://stripe.com', 'investment', 'strong', 'out'),
    P('Airbnb', 'company', 'Marketplace giant from the YC portfolio.', 80, 88, 'https://www.airbnb.com', 'investment', 'medium', 'out'),
    P('Khosla Ventures', 'funder', 'Deep-tech venture firm.', 76, 86, 'https://www.khoslaventures.com', 'partnership', 'medium', 'in'),
    P('Lightspeed', 'funder', 'Global venture firm active in AI infrastructure.', 70, 82, 'https://lsvp.com', 'partnership', 'medium', 'in'),
  ],
  researcher: [
    P('Andrew Ng', 'researcher', 'Stanford professor; Google Brain co-founder.', 86, 90, 'https://www.andrewng.org', 'partnership', 'medium', 'in'),
    P('Ian Goodfellow', 'researcher', 'Inventor of GANs.', 78, 88, 'https://en.wikipedia.org/wiki/Ian_Goodfellow', 'partnership', 'medium', 'in'),
    P('Scaling Laws', 'paper', 'Kaplan et al. (2020) on predictable model scaling.', 80, 90, 'https://arxiv.org/abs/2001.08361', 'researches', 'strong', 'out'),
    P('Mila', 'university', 'Quebec AI institute.', 76, 86, 'https://mila.quebec', 'partnership', 'medium', 'in'),
  ],
  university: [
    P('Andrew Ng', 'researcher', 'Stanford professor; Google Brain co-founder.', 86, 90, 'https://www.andrewng.org', 'employs', 'strong', 'out'),
    P('Mila', 'university', 'Quebec AI institute.', 76, 86, 'https://mila.quebec', 'partnership', 'medium', 'in'),
    P('Oxford', 'university', 'Historic university with a leading AI safety cluster.', 74, 86, 'https://www.ox.ac.uk', 'partnership', 'medium', 'in'),
  ],
  product: [
    P('Llama', 'product', "Meta's open-weight model family.", 86, 90, 'https://www.llama.com', 'competes', 'strong', 'in'),
    P('Grok', 'product', "xAI's conversational AI.", 80, 88, 'https://x.ai', 'competes', 'medium', 'in'),
    P('NotebookLM', 'product', "Google's AI research assistant.", 70, 84, 'https://notebooklm.google', 'competes', 'medium', 'in'),
    P('LangChain', 'product', 'Framework for building LLM applications.', 72, 84, 'https://www.langchain.com', 'partnership', 'medium', 'in'),
  ],
  technology: [
    P('PyTorch', 'technology', 'The dominant open-source ML framework.', 84, 90, 'https://pytorch.org', 'partnership', 'strong', 'in'),
    P('FlashAttention', 'technology', 'IO-aware attention for long-context training.', 76, 86, 'https://github.com/Dao-AILab/flash-attention', 'partnership', 'medium', 'in'),
    P('JAX', 'technology', "Google's high-performance ML framework.", 72, 84, 'https://jax.readthedocs.io', 'competes', 'medium', 'in'),
  ],
  paper: [
    P('Ashish Vaswani', 'researcher', 'First author of Attention Is All You Need.', 80, 88, 'https://en.wikipedia.org/wiki/Attention_Is_All_You_Need', 'researches', 'strong', 'in'),
    P('Scaling Laws', 'paper', 'Kaplan et al. (2020).', 80, 90, 'https://arxiv.org/abs/2001.08361', 'partnership', 'medium', 'in'),
    P('NeurIPS 2020', 'event', 'Landmark virtual edition of the conference.', 72, 84, 'https://neurips.cc', 'partnership', 'medium', 'in'),
  ],
  event: [
    P('NeurIPS 2020', 'event', 'Landmark virtual edition of the conference.', 72, 84, 'https://neurips.cc', 'partnership', 'medium', 'in'),
    P('Nobel Prize 2024', 'event', 'Physics and Chemistry prizes went to AI pioneers.', 80, 90, 'https://www.nobelprize.org', 'partnership', 'medium', 'in'),
    P('Sam Altman', 'researcher', 'Central figure of the ChatGPT era.', 90, 92, 'https://openai.com', 'partnership', 'medium', 'in'),
  ],
  job: [
    P('PyTorch', 'technology', 'The dominant framework for ML roles.', 84, 90, 'https://pytorch.org', 'partnership', 'strong', 'in'),
    P('Kaggle', 'product', 'Competition platform central to hiring pipelines.', 70, 84, 'https://www.kaggle.com', 'partnership', 'medium', 'in'),
    P('OpenAI', 'company', 'Premier employer for the role.', 98, 95, 'https://openai.com', 'employs', 'strong', 'in'),
  ],
  country: [
    P('NIST', 'government', 'US standards agency for AI risk management.', 76, 86, 'https://www.nist.gov', 'partnership', 'medium', 'in'),
    P('Singapore', 'country', 'City-state with an outsized national AI strategy.', 68, 84, 'https://www.smartnation.gov.sg', 'partnership', 'medium', 'in'),
    P('UAE', 'country', 'Gulf state investing heavily in AI infrastructure.', 66, 82, 'https://ai.gov.ae', 'partnership', 'medium', 'in'),
  ],
  government: [
    P('DARPA', 'government', 'Defense research agency funding foundational AI.', 78, 88, 'https://www.darpa.mil', 'partnership', 'medium', 'in'),
    P('NIST', 'government', 'US standards agency for AI risk management.', 76, 86, 'https://www.nist.gov', 'partnership', 'medium', 'in'),
    P('Alan Turing Institute', 'university', "The UK's national AI institute.", 70, 84, 'https://www.turing.ac.uk', 'partnership', 'medium', 'in'),
  ],
  law: [
    P('GDPR', 'law', 'EU data protection law; template for AI regulation.', 80, 90, 'https://gdpr.eu', 'partnership', 'medium', 'in'),
    P('AI Office', 'government', 'EU body enforcing the AI Act.', 68, 82, 'https://digital-strategy.ec.europa.eu/en/policies/ai-office', 'partnership', 'medium', 'in'),
    P('European Commission', 'government', "The EU's executive arm.", 76, 86, 'https://commission.europa.eu', 'partnership', 'medium', 'in'),
  ],
  patent: [
    P('USPTO', 'government', 'US Patent and Trademark Office.', 70, 84, 'https://www.uspto.gov', 'partnership', 'medium', 'in'),
    P('EPO', 'government', 'European Patent Office.', 68, 82, 'https://www.epo.org', 'partnership', 'medium', 'in'),
  ],
};

// ---------------------------------------------------------------------------
// Selection + graft building
// ---------------------------------------------------------------------------

/** Deterministic slice: same node id → same entities, every time. */
function hashPick<T>(arr: readonly T[], key: string, count: number): T[] {
  if (arr.length <= count) return [...arr];
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const start = (h >>> 0) % arr.length;
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(arr[(start + i) % arr.length]);
  return out;
}

/**
 * The curated expansion for a node: bespoke when we wrote one, otherwise a
 * deterministic 3-entity slice of the type pool. Never null for known types.
 */
export function getHardcodedExpansion(node: GNode): KBExpansion | null {
  const bespoke = BY_NODE[node.id];
  if (bespoke) return bespoke;
  const pool = BY_TYPE[node.type];
  if (!pool || pool.length === 0) return null;
  const picked = hashPick(pool, node.id, 3);
  return {
    entities: picked,
    relations: picked.map((p) => ({
      source: p.dir === 'in' ? p.name : SELF,
      target: p.dir === 'in' ? SELF : p.name,
      relation: p.relation,
      strength: p.strength,
    })),
  };
}

export interface HardcodedGraft {
  addedNodes: GNode[];
  addedEdges: GEdge[];
  /** True when the KB covered this node, even if everything deduped away. */
  known: boolean;
}

const FRESHNESS = '2026-10-01';

/**
 * Build a graft from the curated KB, reconciled against the live world:
 * - new entities become GNodes (ids via nodeIdFor, like the live pipeline)
 * - entities already in the world are skipped as nodes; their edges are
 *   rewired to the surviving node id (discovers links between known nodes)
 * - edges whose endpoints resolve to nothing are dropped — never dangling
 * Pure and deterministic.
 */
export function buildHardcodedGraft(world: World, node: GNode): HardcodedGraft | null {
  const kb = getHardcodedExpansion(node);
  if (!kb) return null;

  const urlByName = new Map(kb.entities.map((e) => [e.name, e.url] as const));
  const urlFor = (name: string): string =>
    name === SELF
      ? 'https://en.wikipedia.org/wiki/Artificial_intelligence'
      : (urlByName.get(name) ?? 'https://en.wikipedia.org/wiki/Artificial_intelligence');

  const candidateNodes: GNode[] = kb.entities.map((e) => ({
    id: nodeIdFor(e.name),
    name: e.name,
    type: e.type,
    description: e.description,
    influence: e.influence,
    reality: { confidence: e.confidence, freshness: FRESHNESS, sources: 3 },
    first_seen: '2026',
  }));
  const addedNodes = dedupeNodes(world.nodes, candidateNodes);

  // Normalized-name index over everything that will exist after the graft,
  // so edges rewire to surviving ids instead of dangling.
  const idByName = new Map<string, string>();
  for (const n of [...world.nodes, ...addedNodes]) {
    const key = normalizeName(n.name);
    if (!idByName.has(key)) idByName.set(key, n.id);
  }
  const nameOf = (endpoint: string): string => (endpoint === SELF ? node.name : endpoint);

  const resolved = kb.relations.flatMap((r) => {
    const s = idByName.get(normalizeName(nameOf(r.source)));
    const t = idByName.get(normalizeName(nameOf(r.target)));
    if (!s || !t || s === t) return [];
    const sName = nameOf(r.source);
    const tName = nameOf(r.target);
    return [
      {
        source: s,
        target: t,
        relation: r.relation,
        strength: r.strength,
        evidence: [
          {
            snippet: `${sName} ${r.relation} ${tName} — curated knowledge.`,
            url: r.source === SELF ? urlFor(r.target) : urlFor(r.source),
            engine: 'hardcoded',
            date: FRESHNESS,
          },
        ],
      },
    ];
  });

  const withIds: GEdge[] = resolved.map((e, i) => ({
    id: `e_hc_${e.source}_${e.target}_${e.relation}_${i}`
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_'),
    ...e,
  }));
  const addedEdges = dedupeEdges(world.edges, withIds);

  return { addedNodes, addedEdges, known: true };
}

/** Node ids the KB covers with a bespoke expansion (for tests/telemetry). */
export function bespokeCoverage(): string[] {
  return Object.keys(BY_NODE);
}
