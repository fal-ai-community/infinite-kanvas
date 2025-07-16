export interface StyleModel {
  id: string;
  name: string;
  imageSrc: string;
  prompt: string;
  loraUrl?: string;
  overlay?: boolean;
}

export const styleModels: StyleModel[] = [
  {
    id: "simpsons",
    name: "Simpsons Style",
    imageSrc: "/images/styles/simpsons.jpg",
    prompt: "convert to Simpsons cartoon style",
  },
  {
    id: "lego",
    name: "Lego Style",
    imageSrc: "/images/styles/lego.png",
    prompt: "convert to lego style",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/LEGO_lora_weights.safetensors",
  },
  {
    id: "3d",
    name: "3D Game Asset",
    imageSrc: "/images/styles/3d.jpg",
    prompt: "Create 3D game asset, isometric view version",
    loraUrl:
      "https://huggingface.co/fal/3D-Game-Assets-Kontext-Dev-LoRA/resolve/main/MnzfOWwLjl1CL_0qu7F6E_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "pixel",
    name: "Pixel Style",
    imageSrc: "/images/styles/pixel.png",
    prompt: "Turn this image into the Pixel style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/Pixel_lora_weights.safetensors",
  },
  {
    id: "snoopy",
    name: "Snoopy Style",
    imageSrc: "/images/styles/snoopy.png",
    prompt: "Turn this image into the Snoopy style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/Snoopy_lora_weights.safetensors",
  },
  {
    id: "jojo",
    name: "JoJo Style",
    imageSrc: "/images/styles/jojo.png",
    prompt: "Turn this image into the JoJo style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/Jojo_lora_weights.safetensors",
  },
  {
    id: "clay",
    name: "Clay Style",
    imageSrc: "/images/styles/clay.png",
    prompt: "Turn this image into the Clay style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/Clay_Toy_lora_weights.safetensors",
  },
  {
    id: "ghibli",
    name: "Ghibli Style",
    imageSrc: "/images/styles/ghibli.png",
    prompt: "Turn this image into the Ghibli style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/Ghibli_lora_weights.safetensors",
  },
  {
    id: "americancartoon",
    name: "American Cartoon Style",
    imageSrc: "/images/styles/americancartoon.png",
    prompt: "Turn this image into the American Cartoon style.",
    loraUrl:
      "https://huggingface.co/Owen777/Kontext-Style-Loras/resolve/main/American_Cartoon_lora_weights.safetensors",
  },
  {
    id: "broccoli",
    name: "Broccoli Hair",
    imageSrc: "/images/styles/broccoli.jpeg",
    prompt: "Change hair to a broccoli haircut",
    loraUrl:
      "https://huggingface.co/fal/Broccoli-Hair-Kontext-Dev-LoRA/resolve/main/broccoli-hair-kontext-dev-lora.safetensors",
  },
  {
    id: "plushie",
    name: "Plushie Style",
    imageSrc: "/images/styles/plushie.png",
    prompt: "Convert to plushie style",
    loraUrl:
      "https://huggingface.co/fal/Plushie-Kontext-Dev-LoRA/resolve/main/plushie-kontext-dev-lora.safetensors",
  },
  {
    id: "wojak",
    name: "Wojak Style",
    imageSrc: "/images/styles/wojack.jpg",
    prompt: "Convert to wojak style drawing",
    loraUrl:
      "https://huggingface.co/fal/Wojak-Kontext-Dev-LoRA/resolve/main/wojak-kontext-dev-lora.safetensors",
  },
  {
    id: "fluffy",
    name: "Fluffy Style",
    imageSrc: "/images/styles/fluffy.jpg",
    prompt: "make this object fluffy",
  },
  {
    id: "glassprism",
    name: "Glass Prism",
    imageSrc: "/images/styles/glassprism.jpg",
    prompt:
      "make the character/object look like it was made out of glass, black background",
  },
  {
    id: "anime",
    name: "Anime Style",
    imageSrc: "/images/styles/anime.jpg",
    prompt: "convert to anime art style with large eyes and stylized features",
  },
  {
    id: "watercolor",
    name: "Watercolor Style",
    imageSrc: "/images/styles/watercolor.jpg",
    prompt: "Convert this image into watercolor art style",
    loraUrl:
      "https://huggingface.co/fal/Watercolor-Art-Kontext-Dev-LoRA/resolve/main/EAA_1Pfw0sBAvtBbv401y_8a8c4091e9ae45869b469bec4a0d8446_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "pencil_drawing",
    name: "Pencil Drawing Style",
    imageSrc: "/images/styles/pencil_drawing.jpg",
    prompt: "Convert this image into pencil_drawing art style",
    loraUrl:
      "https://huggingface.co/fal/Pencil-Drawing-Kontext-Dev-LoRA/resolve/main/wIvB3erdwsH68WsO1RTbv_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "mosaic",
    name: "Mosaic Art Style",
    imageSrc: "/images/styles/mosaicart.jpg",
    prompt: "Convert this image into mosaic art style",
    loraUrl:
      "https://huggingface.co/fal/Mosaic-Art-Kontext-Dev-LoRA/resolve/main/g_IGTyyzfC27UT9AVlt-v_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "minimalist",
    name: "Minimalist Art Style",
    imageSrc: "/images/styles/minimalist.jpg",
    prompt: "Convert this image into minimalist art style",
    loraUrl:
      "https://huggingface.co/fal/Wojak-Kontext-Dev-LoRA/resolve/main/wojak-kontext-dev-lora.safetensors",
  },
  {
    id: "impressionist",
    name: "Impressionist Art Style",
    imageSrc: "/images/styles/impressionist.jpg",
    prompt: "Convert this image into impressionist art style",
    loraUrl:
      "https://huggingface.co/fal/Impressionist-Art-Kontext-Dev-LoRA/resolve/main/5SX6j2wcLJKgudBqlmver_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "lowpoly",
    name: "Low Poly Art Style",
    imageSrc: "/images/styles/lowpoly.jpg",
    prompt: "Convert this image to low poly version",
    loraUrl:
      "https://huggingface.co/gokaygokay/Low-Poly-Kontext-Dev-LoRA/resolve/main/ZKcZdffUM6qyMYiEE8ed0_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "abstract",
    name: "Abstract Art Style",
    imageSrc: "/images/styles/abstract.jpg",
    prompt: "Convert this image to abstract art style",
    loraUrl:
      "https://huggingface.co/fal/Abstract-Art-Kontext-Dev-LoRA/resolve/main/I_iqVzkUKMbyMntpkSU4J_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "cubist",
    name: "Cubist Art Style",
    imageSrc: "/images/styles/cubist.jpg",
    prompt: "Convert this image to cubist art style",
    loraUrl:
      "https://huggingface.co/fal/Cubist-Art-Kontext-Dev-LoRA/resolve/main/59yr4hcEqhdxkEgIu7iwY_adapter_model_comfy_converted.safetensors",
  },
  {
    id: "charcoal",
    name: "Charcoal Art Style",
    imageSrc: "/images/styles/charcoal.jpg",
    prompt: "Convert this image into charcoal art style",
    loraUrl:
      "https://huggingface.co/fal/Charcoal-Art-Kontext-Dev-LoRA/resolve/main/It2d_UD0qRgotAZjJHXx__adapter_model_comfy_converted.safetensors",
  },
  {
    overlay: true,
    id: "overlay",
    name: "Overlay",
    imageSrc: "/images/styles/overlay.png",
    prompt: "Place it",
    loraUrl:
      "https://huggingface.co/ilkerzgi/Overlay-Kontext-Dev-LoRA/blob/main/WVVtJFD90b8SsU6EzeGkO_adapter_model_comfy_converted.safetensors",
  },
  {
    overlay: true,
    id: "lightfix",
    name: "Light Fix",
    imageSrc: "/images/styles/lightfix.png",
    prompt: "Fuse this image into background",
    loraUrl:
      "https://huggingface.co/gokaygokay/Light-Fix-Kontext-Dev-LoRA/blob/main/oRdQNr1St3rF_DNI7miGM_adapter_model_comfy_converted.safetensors",
  },
  {
    overlay: true,
    id: "fuseit",
    name: "Fuse It",
    imageSrc: "/images/styles/fuseit.png",
    prompt: "Fuse this image into background",
    loraUrl:
      "https://huggingface.co/gokaygokay/Fuse-it-Kontext-Dev-LoRA/blob/main/O93-UdItaNx8JzLYgnf2h_adapter_model_comfy_converted.safetensors",
  },
];
