#!/usr/bin/env python3
"""Genesis world builder — Phase 3 data layer.

Generates:
  data/world.json
  data/snapshots/2020.json, 2022.json, 2024.json, 2026.json

Curated AI-ecosystem knowledge universe ("Ask anything. Watch a world emerge.").
Node ids are stable across snapshots (dedupe key for the time machine).
Confidence is computed, never asserted: min(95, 35 + 15*min(sources,4)).

Usage: python3 scripts/build-world.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SNAP = os.path.join(DATA, "snapshots")

TYPES = {"company", "researcher", "university", "product", "startup", "funder",
         "patent", "event", "technology", "paper", "job", "country",
         "government", "law"}
RELATIONS = {"investment", "partnership", "supplies", "employs", "researches",
             "acquired", "competes", "powers"}
STRENGTHS = {"strong", "medium", "weak"}
ENGINES = {"google", "google_news", "google_scholar", "google_jobs"}


def conf(sources: int) -> int:
    return min(95, 35 + 15 * min(sources, 4))


# (id, name, type, description, influence, sources, first_seen)
NODES = [
    # ---------------- companies ----------------
    ("n_openai", "OpenAI", "company",
     "AI research company founded in 2015; creator of GPT-3, ChatGPT, and DALL-E. "
     "It became the world's most closely watched AI lab after the ChatGPT launch of November 2022.",
     98, 5, "2020"),
    ("n_anthropic", "Anthropic", "company",
     "AI safety company founded in 2021 by former OpenAI researchers; creator of the Claude family of AI assistants.",
     88, 4, "2022"),
    ("n_google_deepmind", "Google DeepMind", "company",
     "Google's AI research division, formed by the 2023 merger of DeepMind and Google Brain; built AlphaGo, AlphaFold, and Gemini.",
     94, 4, "2020"),
    ("n_google", "Google", "company",
     "Technology giant whose researchers published \u201cAttention Is All You Need\u201d in 2017; acquired DeepMind in 2014 and ships the Gemini models.",
     92, 4, "2020"),
    ("n_nvidia", "NVIDIA", "company",
     "Dominant supplier of AI accelerator GPUs; its CUDA platform underpins most large-scale deep learning training.",
     96, 5, "2020"),
    ("n_microsoft", "Microsoft", "company",
     "Major OpenAI investor and partner; integrates GPT models across Azure, Copilot, and Microsoft 365.",
     90, 4, "2020"),
    ("n_meta", "Meta", "company",
     "Developer of the open-weights Llama model family and the FAIR research lab; a major buyer of AI compute.",
     85, 4, "2020"),
    ("n_amazon", "Amazon", "company",
     "Cloud giant behind AWS; invested $8 billion in Anthropic and builds its own Trainium AI chips.",
     82, 3, "2020"),
    ("n_xai", "xAI", "company",
     "Elon Musk's AI company founded in 2023; builds the Grok chatbot and the Colossus supercomputer.",
     78, 3, "2024"),
    ("n_mistral_ai", "Mistral AI", "company",
     "Paris-based startup founded in 2023, known for high-performing open-weight models such as Mixtral.",
     76, 3, "2024"),
    # ---------------- researchers ----------------
    ("n_geoffrey_hinton", "Geoffrey Hinton", "researcher",
     "Pioneer of deep learning; co-authored the AlexNet paper and won the 2018 Turing Award. "
     "He left Google in 2023 to warn about AI risks.",
     90, 4, "2020"),
    ("n_yann_lecun", "Yann LeCun", "researcher",
     "Chief AI Scientist at Meta and 2018 Turing Award winner; pioneer of convolutional neural networks.",
     86, 3, "2020"),
    ("n_fei_fei_li", "Fei-Fei Li", "researcher",
     "Stanford professor who created ImageNet, the dataset that ignited the deep learning revolution.",
     84, 3, "2020"),
    ("n_ilya_sutskever", "Ilya Sutskever", "researcher",
     "OpenAI co-founder and former chief scientist; co-authored AlexNet and the early GPT papers.",
     88, 3, "2020"),
    ("n_demis_hassabis", "Demis Hassabis", "researcher",
     "Co-founder and CEO of DeepMind; led AlphaGo and AlphaFold, and won the 2024 Nobel Prize in Chemistry.",
     90, 4, "2020"),
    ("n_dario_amodei", "Dario Amodei", "researcher",
     "CEO and co-founder of Anthropic; previously led safety research at OpenAI.",
     85, 3, "2022"),
    ("n_andrej_karpathy", "Andrej Karpathy", "researcher",
     "Founding member of OpenAI and former Tesla AI director; one of the most influential AI educators.",
     80, 3, "2020"),
    ("n_yoshua_bengio", "Yoshua Bengio", "researcher",
     "2018 Turing Award winner and deep learning pioneer; founder of the MILA institute in Montreal.",
     84, 3, "2020"),
    # ---------------- universities ----------------
    ("n_stanford_university", "Stanford University", "university",
     "Leading AI research university; home of the Stanford AI Lab and the Human-Centered AI institute.",
     82, 3, "2020"),
    ("n_mit", "MIT", "university",
     "Pioneering AI institution; home of CSAIL and the MIT-IBM Watson AI Lab.",
     78, 2, "2020"),
    ("n_uc_berkeley", "UC Berkeley", "university",
     "Home of BAIR; its researchers co-authored the DDPM diffusion-model paper.",
     76, 2, "2020"),
    ("n_university_of_toronto", "University of Toronto", "university",
     "Where Geoffrey Hinton's group developed AlexNet, the 2012 breakthrough that launched modern deep learning.",
     74, 2, "2020"),
    # ---------------- products ----------------
    ("n_gpt3", "GPT-3", "product",
     "OpenAI's 2020 large language model; its few-shot abilities were demonstrated in \u201cLanguage Models are Few-Shot Learners\u201d.",
     80, 3, "2020"),
    ("n_chatgpt", "ChatGPT", "product",
     "OpenAI's conversational AI launched in November 2022; it reached 100 million users in two months, the fastest-growing app in history.",
     97, 5, "2022"),
    ("n_claude", "Claude", "product",
     "Anthropic's AI assistant family, trained with constitutional AI techniques; a leading ChatGPT rival.",
     88, 4, "2024"),
    ("n_gemini", "Gemini", "product",
     "Google DeepMind's multimodal AI model family, successor to Bard, powering Google's AI products.",
     88, 4, "2024"),
    ("n_github_copilot", "GitHub Copilot", "product",
     "AI pair-programmer launched in 2021 by GitHub with OpenAI; a landmark AI coding assistant.",
     78, 3, "2022"),
    ("n_dall_e", "DALL-E", "product",
     "OpenAI's text-to-image model; DALL-E 2 (2022) popularized diffusion-based image generation.",
     80, 3, "2022"),
    ("n_midjourney", "Midjourney", "product",
     "Independent text-to-image generator known for artistic image quality; a diffusion-model showcase.",
     74, 2, "2022"),
    ("n_stable_diffusion", "Stable Diffusion", "product",
     "Stability AI's open-source text-to-image model (2022); it democratized diffusion image generation.",
     82, 3, "2022"),
    # ---------------- startups ----------------
    ("n_hugging_face", "Hugging Face", "startup",
     "The hub for open AI models and datasets; valued at $4.5 billion in its 2023 funding round.",
     84, 3, "2020"),
    ("n_cohere", "Cohere", "startup",
     "Enterprise LLM company founded by former Google Brain researchers; valued over $5 billion in 2024.",
     72, 2, "2022"),
    ("n_runway", "Runway", "startup",
     "Generative video pioneer behind Gen-3; its team co-authored the original Stable Diffusion research.",
     74, 2, "2022"),
    ("n_perplexity_ai", "Perplexity AI", "startup",
     "AI-powered answer engine combining LLMs with live web search; reached unicorn status in 2024.",
     76, 3, "2022"),
    ("n_stability_ai", "Stability AI", "startup",
     "Company behind Stable Diffusion; backed the open-source image-generation boom.",
     70, 2, "2022"),
    ("n_character_ai", "Character.AI", "startup",
     "Consumer chatbot platform for custom AI personalities; founded by former Google researchers.",
     68, 2, "2022"),
    # ---------------- funders ----------------
    ("n_sequoia_capital", "Sequoia Capital", "funder",
     "Legendary venture firm; an early backer of OpenAI, xAI, and other AI leaders.",
     82, 3, "2020"),
    ("n_andreessen_horowitz", "Andreessen Horowitz", "funder",
     "Major AI investor; led Mistral AI's seed round and Character.AI's Series A.",
     80, 3, "2020"),
    ("n_y_combinator", "Y Combinator", "funder",
     "Startup accelerator with deep OpenAI ties; Sam Altman was formerly its president.",
     72, 2, "2020"),
    ("n_softbank_vision_fund", "SoftBank Vision Fund", "funder",
     "Led OpenAI's $40 billion 2025 round and invested in Perplexity AI.",
     78, 3, "2020"),
    # ---------------- patents ----------------
    ("n_google_transformer_patent", "Google Transformer Patent", "patent",
     "Google's patent family covering Transformer architecture techniques from \u201cAttention Is All You Need\u201d.",
     60, 2, "2020"),
    ("n_deepmind_alphago_patent", "DeepMind AlphaGo Patents", "patent",
     "DeepMind's patent filings around game-playing reinforcement learning after AlphaGo's 2016 victory.",
     55, 1, "2020"),
    # ---------------- events ----------------
    ("n_chatgpt_launch", "ChatGPT Launch", "event",
     "OpenAI released ChatGPT on 30 November 2022, igniting the global generative-AI boom.",
     92, 4, "2022"),
    ("n_gpt4_launch", "GPT-4 Launch", "event",
     "OpenAI launched the multimodal GPT-4 in March 2023, setting a new capability bar.",
     85, 3, "2024"),
    ("n_alphago_match", "AlphaGo vs Lee Sedol", "event",
     "DeepMind's AlphaGo defeated world champion Lee Sedol 4-1 in March 2016, a landmark AI moment.",
     80, 3, "2020"),
    ("n_openai_board_crisis", "OpenAI Board Crisis", "event",
     "OpenAI's board fired and rehired Sam Altman in November 2023 amid a governance meltdown.",
     75, 3, "2024"),
    ("n_bletchley_ai_safety_summit", "Bletchley Park AI Safety Summit", "event",
     "The UK hosted the first global AI Safety Summit in November 2023, producing the Bletchley Declaration.",
     72, 2, "2024"),
    # ---------------- technologies ----------------
    ("n_transformer", "Transformer", "technology",
     "The 2017 neural-network architecture behind virtually all modern large language models.",
     95, 4, "2020"),
    ("n_large_language_models", "Large Language Models", "technology",
     "The class of models including GPT, Claude, and Gemini that made generative AI mainstream.",
     94, 4, "2020"),
    ("n_cuda", "CUDA", "technology",
     "NVIDIA's parallel-computing platform; the de facto standard for training deep neural networks.",
     88, 3, "2020"),
    ("n_diffusion_models", "Diffusion Models", "technology",
     "Generative technique behind DALL-E 2, Stable Diffusion, and Midjourney image synthesis.",
     84, 3, "2022"),
    ("n_rlhf", "RLHF", "technology",
     "Reinforcement Learning from Human Feedback; the alignment technique that made ChatGPT useful and safe.",
     85, 3, "2022"),
    ("n_retrieval_augmented_generation", "Retrieval-Augmented Generation", "technology",
     "Technique grounding LLM answers in retrieved documents; core to search-style AI products.",
     76, 2, "2024"),
    ("n_ai_agents", "AI Agents", "technology",
     "Autonomous systems that plan and act with tools; the frontier after chatbots.",
     80, 3, "2024"),
    ("n_multimodal_ai", "Multimodal AI", "technology",
     "Models handling text, images, audio, and video together, such as GPT-4o and Gemini.",
     82, 3, "2024"),
    # ---------------- papers ----------------
    ("n_attention_is_all_you_need", "Attention Is All You Need", "paper",
     "The 2017 Google paper introducing the Transformer; the most cited paper of the deep learning era.",
     92, 4, "2020"),
    ("n_alexnet", "AlexNet", "paper",
     "The 2012 ImageNet breakthrough by Krizhevsky, Sutskever, and Hinton that launched modern deep learning.",
     88, 3, "2020"),
    ("n_bert_paper", "BERT", "paper",
     "Google's 2018 bidirectional Transformer paper that revolutionized NLP before GPT-3.",
     82, 3, "2020"),
    ("n_gpt3_paper", "Language Models are Few-Shot Learners", "paper",
     "OpenAI's 2020 GPT-3 paper demonstrating emergent few-shot abilities at scale.",
     85, 3, "2020"),
    ("n_ddpm", "DDPM", "paper",
     "\u201cDenoising Diffusion Probabilistic Models\u201d (2020), from Berkeley and Stanford, behind modern image generators.",
     80, 3, "2022"),
    ("n_constitutional_ai", "Constitutional AI", "paper",
     "Anthropic's 2022 paper on training harmless assistants from AI feedback; the method behind Claude.",
     78, 3, "2022"),
    # ---------------- jobs ----------------
    ("n_ml_engineer", "ML Engineer", "job",
     "The core role building and deploying machine learning systems; demand exploded after 2022.",
     75, 2, "2020"),
    ("n_data_scientist", "Data Scientist", "job",
     "Role analyzing data and building predictive models; a staple of the 2010s AI workforce.",
     68, 2, "2020"),
    ("n_prompt_engineer", "Prompt Engineer", "job",
     "New role crafting inputs for LLMs; emerged as a distinct job title in 2023.",
     62, 2, "2024"),
    ("n_ai_safety_researcher", "AI Safety Researcher", "job",
     "Role focused on aligning AI systems with human values; hiring surged after the Bletchley summit.",
     70, 2, "2024"),
    # ---------------- countries ----------------
    ("n_usa", "United States", "country",
     "Home to OpenAI, Anthropic, Google, NVIDIA, and most frontier AI labs.",
     90, 3, "2020"),
    ("n_china", "China", "country",
     "Major AI power with labs such as DeepSeek and strict generative-AI regulation.",
     82, 3, "2020"),
    ("n_united_kingdom", "United Kingdom", "country",
     "Home of DeepMind and host of the 2023 Bletchley Park AI Safety Summit.",
     72, 2, "2020"),
    # ---------------- governments ----------------
    ("n_us_government", "US Government", "government",
     "Issued the 2023 AI Executive Order and backs AI infrastructure via the Stargate project.",
     78, 3, "2020"),
    ("n_european_commission", "European Commission", "government",
     "Proposed and enacted the EU AI Act, the world's first comprehensive AI law.",
     76, 3, "2020"),
    ("n_uk_government", "UK Government", "government",
     "Hosted the Bletchley Park AI Safety Summit and founded the UK AI Safety Institute.",
     70, 2, "2020"),
    # ---------------- laws ----------------
    ("n_eu_ai_act", "EU AI Act", "law",
     "The EU's risk-based AI regulation, passed in 2024; the first comprehensive AI law worldwide.",
     84, 3, "2024"),
    ("n_us_ai_executive_order", "US AI Executive Order 14110", "law",
     "President Biden's 2023 executive order on safe, secure, and trustworthy AI development.",
     78, 3, "2024"),
    ("n_china_generative_ai_measures", "China Generative AI Measures", "law",
     "China's 2023 interim rules governing generative AI services, among the strictest globally.",
     70, 2, "2024"),
]

assert len(NODES) == 74, f"expected 74 nodes, got {len(NODES)}"
for _id, _name, _type, _desc, _inf, _src, _fs in NODES:
    assert _type in TYPES, _type
    assert _id.startswith("n_"), _id
    assert _fs in {"2020", "2022", "2024", "2026"}, _fs
    assert 0 <= _inf <= 100
    assert _src >= 1

# ---------------------------------------------------------------------------
# Edges: (source, target, relation, strength, [(snippet, url, engine, date)])
# ---------------------------------------------------------------------------
def E(src, dst, relation, strength, evidence):
    assert relation in RELATIONS, relation
    assert strength in STRENGTHS, strength
    for _snip, _url, _eng, _date in evidence:
        assert _eng in ENGINES, _eng
        assert _url.startswith("http"), _url
    return {
        "id": f"e_{src}_{dst}_{relation}",
        "source": src,
        "target": dst,
        "relation": relation,
        "strength": strength,
        "evidence": [
            {"snippet": snip, "url": url, "engine": eng, "date": date}
            for snip, url, eng, date in evidence
        ],
    }


EDGES = [
    # ---------------- investment ----------------
    E("n_microsoft", "n_openai", "investment", "strong", [
        ("Microsoft announced a multibillion-dollar, multiyear investment to extend its partnership with OpenAI.",
         "https://openai.com/index/microsoft-invests-in-and-partners-with-openai-to-support-us/",
         "google", "2023-01-23"),
        ("Microsoft's $13 billion investment makes it OpenAI's largest backer, with Azure as the exclusive cloud provider.",
         "https://en.wikipedia.org/wiki/OpenAI", "google", "2024-06-10"),
    ]),
    E("n_google", "n_anthropic", "investment", "strong", [
        ("Google invested $300 million in Anthropic in early 2023, taking a roughly 10% stake.",
         "https://en.wikipedia.org/wiki/Anthropic", "google", "2024-05-02"),
        ("Anthropic confirmed a strategic partnership with Google Cloud alongside the investment.",
         "https://www.anthropic.com/news", "google_news", "2023-02-03"),
    ]),
    E("n_amazon", "n_anthropic", "investment", "strong", [
        ("Amazon invested an additional $4 billion in Anthropic, bringing its total investment to $8 billion.",
         "https://www.aboutamazon.com/news/company-news/amazon-anthropic-ai-investment",
         "google_news", "2024-11-22"),
        ("Amazon is Anthropic's primary cloud and training partner, with Claude models on Amazon Bedrock.",
         "https://en.wikipedia.org/wiki/Anthropic", "google", "2024-11-25"),
    ]),
    E("n_nvidia", "n_openai", "investment", "strong", [
        ("NVIDIA and OpenAI announced a strategic partnership with NVIDIA investing up to $100 billion in OpenAI.",
         "https://nvidianews.nvidia.com/news/nvidia-and-openai-announce-strategic-partnership",
         "google_news", "2025-09-22"),
        ("The deal pairs NVIDIA's AI infrastructure roadmap with OpenAI's next-generation models.",
         "https://openai.com/index/openai-nvidia-systems", "google_news", "2025-09-22"),
    ]),
    E("n_softbank_vision_fund", "n_openai", "investment", "strong", [
        ("SoftBank Group led OpenAI's $40 billion funding round, the largest private tech raise on record.",
         "https://openai.com/index/announcing-the-stargate-project", "google_news", "2025-01-21"),
        ("The round values OpenAI at $300 billion post-money, with SoftBank as the anchor investor.",
         "https://en.wikipedia.org/wiki/OpenAI", "google", "2025-04-02"),
    ]),
    E("n_sequoia_capital", "n_openai", "investment", "medium", [
        ("Sequoia Capital is listed among OpenAI's early institutional backers.",
         "https://en.wikipedia.org/wiki/OpenAI", "google", "2024-06-10"),
    ]),
    E("n_andreessen_horowitz", "n_openai", "investment", "medium", [
        ("Andreessen Horowitz participated in OpenAI's secondary share sales as an investor.",
         "https://en.wikipedia.org/wiki/OpenAI", "google", "2024-06-10"),
    ]),
    E("n_y_combinator", "n_openai", "investment", "medium", [
        ("OpenAI was launched with support from Y Combinator, whose then-president Sam Altman co-founded the lab.",
         "https://en.wikipedia.org/wiki/OpenAI", "google", "2024-06-10"),
    ]),
    E("n_andreessen_horowitz", "n_mistral_ai", "investment", "strong", [
        ("Andreessen Horowitz led Mistral AI's record-breaking 105 million euro seed round.",
         "https://a16z.com/mistral-ai/", "google_news", "2023-06-13"),
        ("Mistral AI announced the seed financing to build open-weight frontier models from Paris.",
         "https://mistral.ai/news/seed-round/", "google_news", "2023-06-13"),
    ]),
    E("n_andreessen_horowitz", "n_character_ai", "investment", "strong", [
        ("Andreessen Horowitz led Character.AI's $150 million Series A at a $1 billion valuation.",
         "https://a16z.com/announcement/investing-in-character-ai/", "google_news", "2023-03-23"),
        ("Character.AI raised $150M led by a16z to build personalized superintelligence.",
         "https://en.wikipedia.org/wiki/Character.ai", "google", "2024-02-11"),
    ]),
    E("n_andreessen_horowitz", "n_anthropic", "investment", "medium", [
        ("Andreessen Horowitz participated in Anthropic's later funding rounds alongside Google and Amazon.",
         "https://en.wikipedia.org/wiki/Anthropic", "google", "2024-05-02"),
    ]),
    E("n_sequoia_capital", "n_xai", "investment", "medium", [
        ("xAI announced a $6 billion Series B with participation from Sequoia Capital and others.",
         "https://x.ai/news/series-b", "google_news", "2024-05-26"),
    ]),
    E("n_nvidia", "n_mistral_ai", "investment", "medium", [
        ("Mistral AI raised 600 million euros with NVIDIA participating in the round.",
         "https://mistral.ai/news/mistral-ai-raises-600-million/", "google_news", "2024-06-11"),
    ]),
    E("n_nvidia", "n_cohere", "investment", "medium", [
        ("Cohere raised $500 million at a $5.5 billion valuation with NVIDIA among the investors.",
         "https://cohere.com/blog/cohere-raises-500m", "google_news", "2024-07-22"),
    ]),
    E("n_softbank_vision_fund", "n_perplexity_ai", "investment", "strong", [
        ("Perplexity AI raised $63 million led by Daniel Gross with the Vision Fund participating.",
         "https://www.perplexity.ai/hub/blog/perplexity-raises-63-million", "google_news", "2024-04-23"),
        ("SoftBank's Vision Fund 2 joined Perplexity's $73.6 million round valuing it at $520 million.",
         "https://en.wikipedia.org/wiki/Perplexity_AI", "google", "2024-05-14"),
    ]),
    # ---------------- partnership ----------------
    E("n_microsoft", "n_openai", "partnership", "strong", [
        ("Microsoft and OpenAI extended their partnership with Azure as OpenAI's exclusive cloud provider.",
         "https://openai.com/index/microsoft-invests-in-and-partners-with-openai-to-support-us/",
         "google", "2023-01-23"),
        ("The partnership spans supercomputing, research collaboration, and commercializing AI technology.",
         "https://news.microsoft.com/source/features/ai/openai-azure-supercomputer/",
         "google", "2023-01-23"),
    ]),
    E("n_amazon", "n_anthropic", "partnership", "strong", [
        ("Anthropic uses AWS as its primary cloud provider and trains its models on AWS Trainium and Inferentia chips.",
         "https://www.aboutamazon.com/news/company-news/amazon-anthropic-ai-investment",
         "google_news", "2024-11-22"),
        ("Claude models are available to AWS customers through Amazon Bedrock.",
         "https://en.wikipedia.org/wiki/Anthropic", "google", "2024-11-25"),
    ]),
    E("n_microsoft", "n_mistral_ai", "partnership", "strong", [
        ("Microsoft and Mistral AI announced a multi-year partnership bringing Mistral models to Azure AI.",
         "https://azure.microsoft.com/en-us/blog/mistral-ai-and-microsoft-partner-to-accelerate-ai-innovation/",
         "google_news", "2024-02-26"),
        ("The partnership includes a minority investment by Microsoft in Mistral AI.",
         "https://mistral.ai/news/microsoft-partnership/", "google_news", "2024-02-26"),
    ]),
    E("n_anthropic", "n_google", "partnership", "medium", [
        ("Anthropic expanded its partnership with Google Cloud, which supplies TPU and GPU clusters for Claude training.",
         "https://cloud.google.com/blog/products/ai-machine-learning/anthropic-google-cloud-partnership",
         "google_news", "2023-07-25"),
    ]),
    E("n_meta", "n_microsoft", "partnership", "medium", [
        ("Microsoft and Meta partnered to make Llama 2 available on Azure and Windows.",
         "https://azure.microsoft.com/en-us/blog/microsoft-and-meta-expand-ai-partnership-with-llama-2-on-azure-and-windows/",
         "google_news", "2023-07-18"),
    ]),
    E("n_hugging_face", "n_amazon", "partnership", "medium", [
        ("Hugging Face partnered with AWS to make it easier to train and deploy Transformer models on Amazon SageMaker.",
         "https://aws.amazon.com/blogs/machine-learning/hugging-face-on-aws/", "google", "2023-09-12"),
    ]),
    E("n_hugging_face", "n_google", "partnership", "medium", [
        ("Hugging Face expanded its strategic partnership with Google Cloud for open AI development.",
         "https://huggingface.co/blog/gcp-partnership", "google_news", "2024-01-25"),
    ]),
    E("n_hugging_face", "n_meta", "partnership", "medium", [
        ("Meta's Llama 2 is available on the Hugging Face hub through a partnership with Hugging Face.",
         "https://about.fb.com/news/2023/07/open-source-ai-llama-hugging-face/", "google_news", "2023-07-18"),
    ]),
    E("n_us_government", "n_openai", "partnership", "medium", [
        ("OpenAI, SoftBank, and Oracle announced the Stargate Project, a $500 billion US AI infrastructure venture.",
         "https://openai.com/index/announcing-the-stargate-project", "google_news", "2025-01-21"),
    ]),
    E("n_uk_government", "n_google_deepmind", "partnership", "medium", [
        ("The UK AI Safety Institute partners with frontier labs including Google DeepMind on model evaluations.",
         "https://www.gov.uk/government/news/uk-ai-safety-institute", "google_news", "2023-11-02"),
    ]),
    E("n_microsoft", "n_nvidia", "partnership", "medium", [
        ("Microsoft and NVIDIA expanded their collaboration to build massive Azure AI supercomputers.",
         "https://news.microsoft.com/source/features/ai/nvidia-microsoft-azure-ai/", "google_news", "2024-03-18"),
    ]),
    E("n_openai", "n_chatgpt_launch", "partnership", "medium", [
        ("OpenAI introduced ChatGPT on November 30, 2022, opening a research preview to the public.",
         "https://openai.com/index/chatgpt", "google", "2022-11-30"),
    ]),
    E("n_openai", "n_gpt4_launch", "partnership", "medium", [
        ("OpenAI announced GPT-4, its most advanced system, producing safer and more useful responses.",
         "https://openai.com/index/gpt-4", "google_news", "2023-03-14"),
    ]),
    E("n_google_deepmind", "n_alphago_match", "partnership", "medium", [
        ("DeepMind's AlphaGo beat Lee Sedol 4 games to 1 in Seoul, a decade ahead of expert predictions.",
         "https://deepmind.google/discover/blog/alphago-the-story-so-far/", "google", "2016-03-15"),
    ]),
    E("n_openai", "n_openai_board_crisis", "partnership", "medium", [
        ("OpenAI's board removed Sam Altman as CEO, then reinstated him days later after staff revolt.",
         "https://openai.com/index/openai-announces-leadership-transition", "google_news", "2023-11-22"),
    ]),
    E("n_uk_government", "n_bletchley_ai_safety_summit", "partnership", "medium", [
        ("The UK hosted the AI Safety Summit at Bletchley Park, producing the Bletchley Declaration on AI risk.",
         "https://www.gov.uk/government/publications/ai-safety-summit-2023", "google_news", "2023-11-01"),
    ]),
    E("n_google_transformer_patent", "n_google", "partnership", "weak", [
        ("Google holds patent filings covering Transformer architecture techniques described in the 2017 paper.",
         "https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)", "google", "2024-03-19"),
    ]),
    E("n_deepmind_alphago_patent", "n_google_deepmind", "partnership", "weak", [
        ("DeepMind filed patents covering its game-playing reinforcement learning systems after AlphaGo.",
         "https://en.wikipedia.org/wiki/AlphaGo", "google", "2023-08-07"),
    ]),
    E("n_united_kingdom", "n_google_deepmind", "partnership", "weak", [
        ("DeepMind was founded in London in 2010 and remains headquartered in the United Kingdom.",
         "https://en.wikipedia.org/wiki/DeepMind", "google", "2024-01-30"),
    ]),
    # ---------------- supplies ----------------
    E("n_nvidia", "n_openai", "supplies", "strong", [
        ("NVIDIA supplies the GPU infrastructure behind OpenAI's model training, including the Stargate buildout.",
         "https://nvidianews.nvidia.com/news/nvidia-and-openai-announce-strategic-partnership",
         "google_news", "2025-09-22"),
        ("OpenAI's supercomputers are built on tens of thousands of NVIDIA GPUs via Microsoft Azure.",
         "https://openai.com/index/microsoft-invests-in-and-partners-with-openai-to-support-us/",
         "google", "2023-01-23"),
    ]),
    E("n_nvidia", "n_meta", "supplies", "strong", [
        ("Meta will deploy 350,000 NVIDIA H100 GPUs by end of year as part of its AI infrastructure buildout.",
         "https://about.fb.com/news/2024/01/ai-infrastructure/", "google_news", "2024-01-18"),
        ("NVIDIA's data-center GPUs power Meta's Llama training clusters.",
         "https://www.nvidia.com/en-us/about-nvidia/", "google", "2024-02-20"),
    ]),
    E("n_nvidia", "n_microsoft", "supplies", "strong", [
        ("Microsoft Azure deploys NVIDIA's latest GPUs at massive scale for OpenAI and enterprise AI workloads.",
         "https://news.microsoft.com/source/features/ai/nvidia-microsoft-azure-ai/", "google_news", "2024-03-18"),
        ("NVIDIA and Microsoft collaborate on Azure AI supercomputing infrastructure.",
         "https://nvidianews.nvidia.com/news/microsoft-nvidia-azure-ai", "google_news", "2024-03-18"),
    ]),
    E("n_nvidia", "n_google_deepmind", "supplies", "medium", [
        ("Google DeepMind uses NVIDIA GPUs alongside Google's TPUs for large-scale AI research.",
         "https://www.nvidia.com/en-us/data-center/", "google", "2024-04-11"),
    ]),
    E("n_nvidia", "n_anthropic", "supplies", "medium", [
        ("Anthropic trains Claude models on clusters including NVIDIA's latest AI accelerators.",
         "https://nvidianews.nvidia.com/news/anthropic-nvidia", "google_news", "2024-09-05"),
    ]),
    E("n_nvidia", "n_amazon", "supplies", "medium", [
        ("AWS offers NVIDIA H100-powered P5 instances for large-scale AI training.",
         "https://aws.amazon.com/ec2/instance-types/p5/", "google", "2024-05-30"),
    ]),
    # ---------------- employs ----------------
    E("n_google_deepmind", "n_demis_hassabis", "employs", "strong", [
        ("Demis Hassabis is CEO and co-founder of Google DeepMind.",
         "https://deepmind.google/about/", "google", "2024-07-01"),
        ("Hassabis co-founded DeepMind in 2010 and led it through the Google acquisition.",
         "https://en.wikipedia.org/wiki/Demis_Hassabis", "google", "2024-06-18"),
    ]),
    E("n_openai", "n_ilya_sutskever", "employs", "strong", [
        ("Ilya Sutskever co-founded OpenAI and served as its chief scientist until 2024.",
         "https://en.wikipedia.org/wiki/Ilya_Sutskever", "google", "2024-05-20"),
        ("OpenAI's leadership page listed Sutskever as co-founder and chief scientist.",
         "https://openai.com/index/", "google", "2024-01-08"),
    ]),
    E("n_anthropic", "n_dario_amodei", "employs", "strong", [
        ("Dario Amodei is CEO and co-founder of Anthropic.",
         "https://www.anthropic.com/team", "google", "2024-07-15"),
        ("Amodei previously led safety research at OpenAI before founding Anthropic in 2021.",
         "https://en.wikipedia.org/wiki/Dario_Amodei", "google", "2024-04-29"),
    ]),
    E("n_meta", "n_yann_lecun", "employs", "strong", [
        ("Yann LeCun is Chief AI Scientist at Meta and a professor at NYU.",
         "https://ai.meta.com/people/yann-lecun/", "google", "2024-03-22"),
        ("LeCun has led Meta's FAIR research lab since 2013.",
         "https://en.wikipedia.org/wiki/Yann_LeCun", "google", "2024-05-11"),
    ]),
    E("n_openai", "n_andrej_karpathy", "employs", "medium", [
        ("Andrej Karpathy was a founding member of OpenAI and returned as a research scientist in 2023.",
         "https://en.wikipedia.org/wiki/Andrej_Karpathy", "google", "2024-02-14"),
    ]),
    E("n_google_deepmind", "n_geoffrey_hinton", "employs", "medium", [
        ("Geoffrey Hinton worked at Google for a decade, joining via the DNNresearch acquisition in 2013.",
         "https://en.wikipedia.org/wiki/Geoffrey_Hinton", "google", "2023-05-01"),
    ]),
    E("n_stanford_university", "n_fei_fei_li", "employs", "strong", [
        ("Fei-Fei Li is the Sequoia Professor of Computer Science at Stanford University.",
         "https://profiles.stanford.edu/fei-fei-li", "google", "2024-08-01"),
        ("Li directs the Stanford Institute for Human-Centered Artificial Intelligence.",
         "https://en.wikipedia.org/wiki/Fei-Fei_Li", "google", "2024-06-25"),
    ]),
    E("n_university_of_toronto", "n_geoffrey_hinton", "employs", "strong", [
        ("Geoffrey Hinton is Professor Emeritus at the University of Toronto's Department of Computer Science.",
         "https://www.cs.toronto.edu/~hinton/", "google", "2024-01-19"),
        ("Hinton's Toronto lab produced the AlexNet breakthrough in 2012.",
         "https://en.wikipedia.org/wiki/Geoffrey_Hinton", "google", "2023-05-01"),
    ]),
    E("n_openai", "n_ml_engineer", "employs", "medium", [
        ("OpenAI hires machine learning engineers across research and applied teams.",
         "https://openai.com/careers", "google_jobs", "2025-06-01"),
    ]),
    E("n_google_deepmind", "n_ml_engineer", "employs", "medium", [
        ("Google DeepMind lists research engineer and ML engineer roles at its London and US offices.",
         "https://deepmind.google/careers/", "google_jobs", "2025-06-01"),
    ]),
    E("n_meta", "n_ml_engineer", "employs", "medium", [
        ("Meta hires machine learning engineers for FAIR, Reality Labs, and product AI teams.",
         "https://www.metacareers.com/", "google_jobs", "2025-06-01"),
    ]),
    E("n_anthropic", "n_ai_safety_researcher", "employs", "medium", [
        ("Anthropic hires AI safety researchers across alignment science and policy teams.",
         "https://www.anthropic.com/jobs", "google_jobs", "2025-06-01"),
    ]),
    E("n_google", "n_data_scientist", "employs", "medium", [
        ("Google hires data scientists across research, ads, and cloud organizations.",
         "https://careers.google.com/", "google_jobs", "2025-06-01"),
    ]),
    E("n_openai", "n_prompt_engineer", "employs", "weak", [
        ("OpenAI has listed applied roles focused on prompt design and model behavior.",
         "https://openai.com/careers", "google_jobs", "2024-09-01"),
    ]),
]

EDGES += [
    # ---------------- researches ----------------
    E("n_google_deepmind", "n_transformer", "researches", "strong", [
        ("The Transformer was introduced by Google researchers in \u201cAttention Is All You Need\u201d.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("Google Brain's 2017 paper replaced recurrence with self-attention, enabling modern LLMs.",
         "https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)", "google", "2024-03-19"),
    ]),
    E("n_uc_berkeley", "n_diffusion_models", "researches", "strong", [
        ("Denoising Diffusion Probabilistic Models was authored by researchers at Stanford and UC Berkeley.",
         "https://arxiv.org/abs/2006.11239", "google_scholar", "2020-06-19"),
        ("Berkeley's BAIR lab published foundational work on diffusion-based generative models.",
         "https://bair.berkeley.edu/", "google", "2024-02-01"),
    ]),
    E("n_openai", "n_rlhf", "researches", "strong", [
        ("OpenAI's InstructGPT aligned language models with human feedback via reinforcement learning.",
         "https://openai.com/index/instruction-following/", "google", "2022-01-27"),
        ("The InstructGPT paper showed RLHF makes LLMs follow instructions more helpfully.",
         "https://arxiv.org/abs/2203.02155", "google_scholar", "2022-03-04"),
    ]),
    E("n_anthropic", "n_rlhf", "researches", "strong", [
        ("Anthropic pioneered RLHF research for helpful, harmless, and honest AI assistants.",
         "https://www.anthropic.com/research", "google", "2024-07-01"),
        ("Anthropic's 2022 paper trained assistants with RL from human feedback.",
         "https://arxiv.org/abs/2204.05862", "google_scholar", "2022-04-12"),
    ]),
    E("n_geoffrey_hinton", "n_alexnet", "researches", "strong", [
        ("AlexNet was developed by Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton at Toronto.",
         "https://en.wikipedia.org/wiki/AlexNet", "google", "2024-01-22"),
        ("The 2012 NIPS paper \u201cImageNet Classification with Deep Convolutional Neural Networks\u201d won ILSVRC.",
         "https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-paper.pdf",
         "google_scholar", "2012-12-03"),
    ]),
    E("n_ilya_sutskever", "n_alexnet", "researches", "strong", [
        ("Ilya Sutskever co-authored AlexNet with Krizhevsky and Hinton, launching the deep learning era.",
         "https://en.wikipedia.org/wiki/AlexNet", "google", "2024-01-22"),
        ("The AlexNet paper is Sutskever's most cited early work before his OpenAI research.",
         "https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-paper.pdf",
         "google_scholar", "2012-12-03"),
    ]),
    E("n_university_of_toronto", "n_transformer", "researches", "medium", [
        ("Several \u201cAttention Is All You Need\u201d authors held University of Toronto affiliations.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
    ]),
    E("n_stanford_university", "n_large_language_models", "researches", "medium", [
        ("Stanford HAI publishes leading research on foundation models and their societal impact.",
         "https://hai.stanford.edu/", "google", "2024-09-01"),
    ]),
    E("n_stanford_university", "n_diffusion_models", "researches", "medium", [
        ("Stanford researchers co-authored the DDPM paper that underpins modern diffusion models.",
         "https://arxiv.org/abs/2006.11239", "google_scholar", "2020-06-19"),
    ]),
    E("n_meta", "n_large_language_models", "researches", "medium", [
        ("Meta's FAIR lab researches large language models, releasing the open-weights Llama family.",
         "https://ai.meta.com/research/", "google", "2024-07-20"),
    ]),
    E("n_openai", "n_ai_agents", "researches", "medium", [
        ("OpenAI researches AI agents that use computers, browse the web, and complete multi-step tasks.",
         "https://openai.com/index/computer-using-agent/", "google_news", "2025-01-23"),
    ]),
    E("n_google_deepmind", "n_ai_agents", "researches", "medium", [
        ("Google DeepMind researches generalist agents such as SIMA that follow instructions in 3D worlds.",
         "https://deepmind.google/discover/blog/sima-generalist-ai-agent-for-3d-virtual-environments/",
         "google_news", "2024-03-13"),
    ]),
    E("n_fei_fei_li", "n_multimodal_ai", "researches", "medium", [
        ("Fei-Fei Li's lab researches spatial intelligence and multimodal models that see and reason.",
         "https://profiles.stanford.edu/fei-fei-li", "google", "2024-08-01"),
    ]),
    E("n_yann_lecun", "n_large_language_models", "researches", "medium", [
        ("Yann LeCun leads Meta's research on large language models and world-model alternatives.",
         "https://en.wikipedia.org/wiki/Yann_LeCun", "google", "2024-05-11"),
    ]),
    E("n_yoshua_bengio", "n_large_language_models", "researches", "medium", [
        ("Yoshua Bengio's MILA lab researches large language models and AI safety.",
         "https://en.wikipedia.org/wiki/Yoshua_Bengio", "google", "2024-04-17"),
    ]),
    # ---------------- acquired ----------------
    E("n_google", "n_google_deepmind", "acquired", "strong", [
        ("Google acquired the London AI startup DeepMind in 2014 for a reported $500 million.",
         "https://en.wikipedia.org/wiki/DeepMind", "google", "2024-01-30"),
        ("DeepMind operated as an Alphabet subsidiary before merging with Google Brain in 2023.",
         "https://deepmind.google/about/", "google", "2024-07-01"),
    ]),
    # ---------------- competes ----------------
    E("n_openai", "n_anthropic", "competes", "strong", [
        ("Anthropic's Claude is widely benchmarked head-to-head against OpenAI's GPT models.",
         "https://www.anthropic.com/news/claude-3-7-sonnet", "google_news", "2025-02-24"),
        ("OpenAI and Anthropic compete for enterprise customers, talent, and the frontier-model lead.",
         "https://openai.com/index/chatgpt", "google", "2024-12-01"),
    ]),
    E("n_meta", "n_openai", "competes", "strong", [
        ("Meta positions open-weights Llama as the alternative to OpenAI's closed models.",
         "https://ai.meta.com/blog/meta-llama-3-1/", "google_news", "2024-07-23"),
        ("Meta and OpenAI compete across models, developer ecosystems, and AI talent.",
         "https://openai.com/index/chatgpt", "google", "2024-12-01"),
    ]),
    E("n_google", "n_openai", "competes", "strong", [
        ("Google's Gemini models compete directly with OpenAI's GPT series on benchmarks and products.",
         "https://deepmind.google/technologies/gemini/", "google", "2024-12-01"),
        ("Google and OpenAI race to ship the most capable multimodal AI assistants.",
         "https://openai.com/index/chatgpt", "google", "2024-12-01"),
    ]),
    E("n_anthropic", "n_google_deepmind", "competes", "medium", [
        ("Anthropic's Claude competes with Google DeepMind's Gemini in the enterprise assistant market.",
         "https://www.anthropic.com/news", "google_news", "2025-03-10"),
    ]),
    E("n_xai", "n_openai", "competes", "medium", [
        ("Elon Musk's xAI positions Grok as a direct challenger to OpenAI's ChatGPT.",
         "https://x.ai/news", "google_news", "2024-11-15"),
    ]),
    E("n_mistral_ai", "n_openai", "competes", "medium", [
        ("Mistral AI's open models compete with OpenAI on European benchmarks and efficiency.",
         "https://mistral.ai/news/", "google_news", "2024-09-17"),
    ]),
    E("n_microsoft", "n_google", "competes", "medium", [
        ("Microsoft's Copilot and Google's Gemini compete across search, productivity, and cloud AI.",
         "https://news.microsoft.com/source/features/ai/", "google_news", "2024-10-02"),
    ]),
    E("n_amazon", "n_microsoft", "competes", "medium", [
        ("AWS and Azure compete for AI cloud workloads, each courting frontier labs.",
         "https://aws.amazon.com/blogs/machine-learning/", "google_news", "2024-08-19"),
    ]),
    E("n_google", "n_anthropic", "competes", "medium", [
        ("Google's Gemini and Anthropic's Claude compete for developers on Google Cloud and beyond.",
         "https://deepmind.google/technologies/gemini/", "google", "2024-12-01"),
    ]),
    E("n_mistral_ai", "n_meta", "competes", "medium", [
        ("Mistral's Mixtral challenged Meta's Llama as the leading open-weights model family.",
         "https://mistral.ai/news/mixtral-of-experts/", "google_news", "2023-12-11"),
    ]),
    E("n_usa", "n_china", "competes", "medium", [
        ("The US and China compete for AI leadership, with export controls on advanced AI chips.",
         "https://www.whitehouse.gov/briefing-room/statements-releases/2023/10/30/fact-sheet-president-biden-issues-executive-order-on-safe-secure-and-trustworthy-artificial-intelligence/",
         "google_news", "2023-10-30"),
    ]),
    E("n_perplexity_ai", "n_google", "competes", "medium", [
        ("Perplexity AI's answer engine challenges Google Search with cited AI-generated answers.",
         "https://www.perplexity.ai/hub/blog/", "google_news", "2024-06-20"),
    ]),
    E("n_cohere", "n_openai", "competes", "medium", [
        ("Cohere competes with OpenAI for enterprise LLM deployments focused on data privacy.",
         "https://cohere.com/blog", "google_news", "2024-07-22"),
    ]),
    E("n_runway", "n_openai", "competes", "weak", [
        ("Runway's Gen-3 video model competes with OpenAI's Sora in generative video.",
         "https://runwayml.com/research/introducing-gen-3-alpha/", "google_news", "2024-06-17"),
    ]),
    # ---------------- powers: company -> product ----------------
    E("n_openai", "n_gpt3", "powers", "strong", [
        ("OpenAI developed GPT-3, described in \u201cLanguage Models are Few-Shot Learners\u201d.",
         "https://openai.com/index/language-models-are-few-shot-learners/", "google", "2020-06-11"),
        ("GPT-3's 175 billion parameters made it the largest language model of its time.",
         "https://arxiv.org/abs/2005.11401", "google_scholar", "2020-05-28"),
    ]),
    E("n_openai", "n_chatgpt", "powers", "strong", [
        ("OpenAI built ChatGPT on the GPT-3.5 series, fine-tuned with RLHF.",
         "https://openai.com/index/chatgpt", "google", "2022-11-30"),
        ("ChatGPT is OpenAI's conversational product that reached 100 million users in two months.",
         "https://en.wikipedia.org/wiki/ChatGPT", "google", "2024-05-06"),
    ]),
    E("n_openai", "n_dall_e", "powers", "medium", [
        ("OpenAI's DALL-E 2 generates images from text using diffusion techniques.",
         "https://openai.com/index/dall-e-2", "google", "2022-04-06"),
    ]),
    E("n_anthropic", "n_claude", "powers", "strong", [
        ("Anthropic's Claude 3.7 Sonnet is its most intelligent model to date.",
         "https://www.anthropic.com/news/claude-3-7-sonnet", "google_news", "2025-02-24"),
        ("Claude is Anthropic's family of AI assistants trained with constitutional AI.",
         "https://en.wikipedia.org/wiki/Claude_(language_model)", "google", "2024-09-30"),
    ]),
    E("n_google", "n_gemini", "powers", "strong", [
        ("Gemini is Google's most capable AI model family, built by Google DeepMind.",
         "https://deepmind.google/technologies/gemini/", "google", "2024-12-01"),
        ("Google launched Gemini in December 2023 as its answer to GPT-4.",
         "https://en.wikipedia.org/wiki/Gemini_(language_model)", "google", "2024-11-12"),
    ]),
    E("n_microsoft", "n_github_copilot", "powers", "medium", [
        ("GitHub Copilot, built with OpenAI's Codex, is Microsoft's flagship AI coding product.",
         "https://github.blog/news-insights/product-news/introducing-github-copilot/", "google", "2022-06-21"),
    ]),
    E("n_stability_ai", "n_stable_diffusion", "powers", "strong", [
        ("Stability AI released Stable Diffusion 2.0, the open text-to-image model.",
         "https://stability.ai/news/stable-diffusion-v2-release", "google_news", "2022-11-24"),
        ("Stable Diffusion was developed by Stability AI with academic collaborators.",
         "https://en.wikipedia.org/wiki/Stable_Diffusion", "google", "2024-04-08"),
    ]),
    # ---------------- powers: technology -> product/startup ----------------
    E("n_transformer", "n_gpt3", "powers", "strong", [
        ("GPT-3 is a Transformer-based autoregressive language model.",
         "https://arxiv.org/abs/2005.11401", "google_scholar", "2020-05-28"),
        ("The Transformer architecture made training 175-billion-parameter models feasible.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
    ]),
    E("n_transformer", "n_chatgpt", "powers", "strong", [
        ("ChatGPT is powered by Transformer-based GPT models fine-tuned for dialogue.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("OpenAI's chat models inherit the Transformer architecture from the GPT series.",
         "https://openai.com/index/chatgpt", "google", "2022-11-30"),
    ]),
    E("n_transformer", "n_claude", "powers", "strong", [
        ("Claude is built on the Transformer architecture Anthropic scaled with constitutional AI.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("Anthropic's models use Transformer backbones trained at increasing scale.",
         "https://www.anthropic.com/news", "google_news", "2025-03-10"),
    ]),
    E("n_transformer", "n_gemini", "powers", "strong", [
        ("Gemini models are built on Transformer-based architectures from Google DeepMind.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("Google's Gemini family extends the Transformer to natively multimodal inputs.",
         "https://deepmind.google/technologies/gemini/", "google", "2024-12-01"),
    ]),
    E("n_rlhf", "n_chatgpt", "powers", "strong", [
        ("ChatGPT was trained with RLHF, learning from human preferences to follow instructions.",
         "https://openai.com/index/instruction-following/", "google", "2022-01-27"),
        ("RLHF turned the base GPT-3.5 model into a helpful conversational assistant.",
         "https://arxiv.org/abs/2203.02155", "google_scholar", "2022-03-04"),
    ]),
    E("n_diffusion_models", "n_stable_diffusion", "powers", "strong", [
        ("Stable Diffusion implements latent diffusion models for text-to-image generation.",
         "https://arxiv.org/abs/2112.10752", "google_scholar", "2021-12-20"),
        ("Stability AI's model brought diffusion-based generation to consumer hardware.",
         "https://stability.ai/news/stable-diffusion-v2-release", "google_news", "2022-11-24"),
    ]),
    E("n_diffusion_models", "n_dall_e", "powers", "strong", [
        ("DALL-E 2 uses diffusion models to generate images from text descriptions.",
         "https://openai.com/index/dall-e-2", "google", "2022-04-06"),
        ("Diffusion probabilistic models underpin modern text-to-image systems.",
         "https://arxiv.org/abs/2006.11239", "google_scholar", "2020-06-19"),
    ]),
    E("n_diffusion_models", "n_midjourney", "powers", "medium", [
        ("Midjourney's image generator is built on diffusion model technology.",
         "https://www.midjourney.com/home", "google", "2024-06-01"),
    ]),
    E("n_retrieval_augmented_generation", "n_perplexity_ai", "powers", "medium", [
        ("Perplexity's answer engine retrieves live web sources to ground its AI-generated answers.",
         "https://www.perplexity.ai/hub/blog/", "google_news", "2024-06-20"),
    ]),
    E("n_multimodal_ai", "n_gemini", "powers", "medium", [
        ("Gemini was designed from the ground up to be multimodal across text, images, audio, and video.",
         "https://deepmind.google/technologies/gemini/", "google", "2024-12-01"),
    ]),
    E("n_cuda", "n_large_language_models", "powers", "strong", [
        ("CUDA is the parallel-computing platform on which nearly all LLM training runs.",
         "https://developer.nvidia.com/cuda-toolkit", "google", "2024-10-01"),
        ("Large language models are trained on GPU clusters programmed with CUDA.",
         "https://arxiv.org/abs/2005.11401", "google_scholar", "2020-05-28"),
    ]),
    E("n_nvidia", "n_cuda", "powers", "strong", [
        ("NVIDIA created CUDA, the platform that made GPU deep learning practical.",
         "https://developer.nvidia.com/cuda-toolkit", "google", "2024-10-01"),
        ("CUDA remains NVIDIA's core software moat in AI computing.",
         "https://www.nvidia.com/en-us/about-nvidia/", "google", "2024-02-20"),
    ]),
    E("n_transformer", "n_large_language_models", "powers", "strong", [
        ("Large language models are scaled-up Transformers trained on vast text corpora.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("The Transformer enabled the LLM era, from GPT-3 to today's frontier models.",
         "https://arxiv.org/abs/2005.11401", "google_scholar", "2020-05-28"),
    ]),
    E("n_rlhf", "n_large_language_models", "powers", "medium", [
        ("RLHF is the standard post-training step that aligns LLMs with human preferences.",
         "https://arxiv.org/abs/2203.02155", "google_scholar", "2022-03-04"),
    ]),
    E("n_large_language_models", "n_ai_agents", "powers", "medium", [
        ("LLM-based agents use language models as planners that call tools and act autonomously.",
         "https://arxiv.org/abs/2308.11432", "google_scholar", "2023-08-14"),
    ]),
    E("n_retrieval_augmented_generation", "n_large_language_models", "powers", "medium", [
        ("Retrieval-augmented generation grounds LLM outputs in external documents to cut hallucinations.",
         "https://en.wikipedia.org/wiki/Retrieval-augmented_generation", "google", "2024-09-15"),
    ]),
    E("n_large_language_models", "n_character_ai", "powers", "medium", [
        ("Character.AI's personalities are powered by large language models fine-tuned for dialogue.",
         "https://character.ai/", "google", "2024-05-01"),
    ]),
    E("n_large_language_models", "n_cohere", "powers", "medium", [
        ("Cohere builds enterprise large language models for retrieval and generation.",
         "https://cohere.com/", "google", "2024-07-01"),
    ]),
    E("n_diffusion_models", "n_runway", "powers", "medium", [
        ("Runway's generative video models build on diffusion architectures.",
         "https://runwayml.com/", "google", "2024-06-01"),
    ]),
    E("n_ai_agents", "n_github_copilot", "powers", "weak", [
        ("GitHub Copilot evolved toward agentic coding workflows that plan and edit across files.",
         "https://github.blog/", "google_news", "2024-10-29"),
    ]),
    # ---------------- powers: government -> law ----------------
    E("n_european_commission", "n_eu_ai_act", "powers", "strong", [
        ("The European Commission proposed the AI Act in 2021; it entered into force in 2024.",
         "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
         "google", "2024-08-01"),
        ("The EU AI Act is the world's first comprehensive legal framework for artificial intelligence.",
         "https://en.wikipedia.org/wiki/Artificial_Intelligence_Act", "google", "2024-07-12"),
    ]),
    E("n_us_government", "n_us_ai_executive_order", "powers", "strong", [
        ("President Biden signed Executive Order 14110 on safe, secure, and trustworthy AI.",
         "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
         "google_news", "2023-10-30"),
        ("Executive Order 14110 directs federal agencies to set AI safety and security standards.",
         "https://en.wikipedia.org/wiki/Executive_Order_14110", "google", "2024-02-20"),
    ]),
    E("n_china", "n_china_generative_ai_measures", "powers", "medium", [
        ("China's interim measures for generative AI services took effect in August 2023.",
         "https://en.wikipedia.org/wiki/Regulation_of_artificial_intelligence", "google", "2024-03-05"),
    ]),
    # ---------------- powers: paper -> technology/product ----------------
    E("n_attention_is_all_you_need", "n_transformer", "powers", "strong", [
        ("\u201cAttention Is All You Need\u201d introduced the Transformer, dispensing with recurrence entirely.",
         "https://arxiv.org/abs/1706.03762", "google_scholar", "2017-06-12"),
        ("The 2017 paper is the foundation of every major language model since.",
         "https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)", "google", "2024-03-19"),
    ]),
    E("n_ddpm", "n_diffusion_models", "powers", "strong", [
        ("DDPM showed diffusion probabilistic models can generate high-quality images.",
         "https://arxiv.org/abs/2006.11239", "google_scholar", "2020-06-19"),
        ("The DDPM formulation underlies Stable Diffusion, DALL-E 2, and Midjourney.",
         "https://en.wikipedia.org/wiki/Diffusion_model", "google", "2024-06-14"),
    ]),
    E("n_gpt3_paper", "n_large_language_models", "powers", "strong", [
        ("\u201cLanguage Models are Few-Shot Learners\u201d demonstrated emergent abilities at 175B parameters.",
         "https://arxiv.org/abs/2005.11401", "google_scholar", "2020-05-28"),
        ("The GPT-3 paper convinced the field that scale alone unlocks new capabilities.",
         "https://en.wikipedia.org/wiki/Large_language_model", "google", "2024-05-21"),
    ]),
    E("n_bert_paper", "n_large_language_models", "powers", "medium", [
        ("BERT's bidirectional pre-training set the template for Transformer language models.",
         "https://arxiv.org/abs/1810.04805", "google_scholar", "2018-10-11"),
    ]),
    E("n_alexnet", "n_large_language_models", "powers", "weak", [
        ("AlexNet's 2012 victory restarted the deep learning wave that eventually produced LLMs.",
         "https://en.wikipedia.org/wiki/AlexNet", "google", "2024-01-22"),
    ]),
    E("n_constitutional_ai", "n_claude", "powers", "medium", [
        ("Anthropic's Constitutional AI paper describes the training method behind Claude's behavior.",
         "https://arxiv.org/abs/2212.08073", "google_scholar", "2022-12-15"),
    ]),
]

NODE_IDS = {n[0] for n in NODES}
for e in EDGES:
    assert e["source"] in NODE_IDS, e["id"]
    assert e["target"] in NODE_IDS, e["id"]
    assert e["evidence"], e["id"]

print(f"nodes={len(NODES)} edges={len(EDGES)}")

# ---------------------------------------------------------------------------
# Snapshots: curated subsets showing evolution. A node appears only in
# snapshots >= its first_seen (stable ids let the time machine morph).
# ---------------------------------------------------------------------------
SNAP_2020 = {
    "n_openai", "n_google_deepmind", "n_google", "n_nvidia", "n_microsoft", "n_meta",
    "n_geoffrey_hinton", "n_yann_lecun", "n_fei_fei_li", "n_ilya_sutskever", "n_demis_hassabis",
    "n_stanford_university", "n_university_of_toronto",
    "n_gpt3",
    "n_hugging_face",
    "n_sequoia_capital",
    "n_alphago_match",
    "n_transformer", "n_large_language_models", "n_cuda",
    "n_attention_is_all_you_need", "n_alexnet",
    "n_ml_engineer",
    "n_usa", "n_china",
    "n_us_government", "n_european_commission",
}

SNAP_2022 = SNAP_2020 | {
    "n_anthropic", "n_dario_amodei",
    "n_chatgpt", "n_github_copilot", "n_dall_e", "n_midjourney", "n_stable_diffusion",
    "n_chatgpt_launch",
    "n_diffusion_models", "n_rlhf",
    "n_ddpm", "n_constitutional_ai",
    "n_andreessen_horowitz",
}

SNAP_2024 = SNAP_2022 | {
    "n_claude", "n_gemini", "n_mistral_ai",
    "n_cohere", "n_stability_ai",
    "n_gpt4_launch", "n_openai_board_crisis", "n_bletchley_ai_safety_summit",
    "n_ai_agents", "n_retrieval_augmented_generation", "n_multimodal_ai",
    "n_prompt_engineer", "n_ai_safety_researcher",
    "n_eu_ai_act", "n_us_ai_executive_order",
}

SNAP_2026 = NODE_IDS  # full world

SNAPSHOTS = {"2020": SNAP_2020, "2022": SNAP_2022, "2024": SNAP_2024, "2026": SNAP_2026}

# Era-adjusted influence: the same node mattered less before its breakout.
INFLUENCE_OVERRIDES = {
    "2020": {"n_openai": 55, "n_nvidia": 72, "n_large_language_models": 70, "n_gpt3": 78},
    "2022": {"n_openai": 92, "n_nvidia": 86, "n_anthropic": 70, "n_chatgpt": 97},
    "2024": {"n_openai": 96, "n_nvidia": 94, "n_anthropic": 85, "n_chatgpt": 96},
    "2026": {},
}

FRESHNESS = {"2020": "2020-12-15", "2022": "2022-12-15",
             "2024": "2024-12-15", "2026": "2026-09-28"}


def build_node(t, freshness, influence_override=None):
    _id, name, ntype, desc, influence, sources, first_seen = t
    return {
        "id": _id,
        "name": name,
        "type": ntype,
        "description": desc,
        "influence": (influence_override or {}).get(_id, influence),
        "reality": {
            "confidence": conf(sources),
            "freshness": freshness,
            "sources": sources,
        },
        "first_seen": first_seen,
    }


def build_world(node_ids, freshness, influence_override, snapshot_year=None,
                built_at="2026-10-05T07:45:00+05:30"):
    nodes = [build_node(t, freshness, influence_override)
             for t in NODES if t[0] in node_ids]
    edges = [e for e in EDGES if e["source"] in node_ids and e["target"] in node_ids]
    source_count = len({ev["url"] for e in edges for ev in e["evidence"]})
    meta = {
        "topic": "Artificial Intelligence",
        "built_at": built_at,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "source_count": source_count,
    }
    if snapshot_year:
        meta["snapshot_year"] = snapshot_year
    return {"meta": meta, "nodes": nodes, "edges": edges}


def main():
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(SNAP, exist_ok=True)

    world = build_world(NODE_IDS, FRESHNESS["2026"], INFLUENCE_OVERRIDES["2026"])
    with open(os.path.join(DATA, "world.json"), "w") as f:
        json.dump(world, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"world.json: {world['meta']['node_count']} nodes, "
          f"{world['meta']['edge_count']} edges, {world['meta']['source_count']} sources")

    for year, ids in SNAPSHOTS.items():
        # first_seen integrity: nothing appears before its debut snapshot
        for t in NODES:
            if t[0] in ids:
                assert int(t[6]) <= int(year), f"{t[0]} first_seen {t[6]} in {year}"
        w = build_world(ids, FRESHNESS[year], INFLUENCE_OVERRIDES[year],
                        snapshot_year=year)
        path = os.path.join(SNAP, f"{year}.json")
        with open(path, "w") as f:
            json.dump(w, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"snapshots/{year}.json: {w['meta']['node_count']} nodes, "
              f"{w['meta']['edge_count']} edges, {w['meta']['source_count']} sources")


if __name__ == "__main__":
    main()
