---
name: react-three-fiber
description: "Declarative 3D graphics, interactive WebGL scenes, realistic PBR materials, 3D book meshes, floating environments, camera rigs, and performance-optimized Three.js / React Three Fiber (@react-three/fiber & @react-three/drei) patterns."
---

# React Three Fiber & Declarative 3D Craft (`react-three-fiber`)

Use this skill when building, upgrading, or animating 3D scenes on the web—whether using `@react-three/fiber` + `@react-three/drei` (via ESM/importmap or bundler) or declarative Three.js scene graphs inspired by R3F (`<Canvas>`, `<Float>`, `<Environment>`, `<ContactShadows>`, `<PresentationControls>`).

## Core Principles

1. **Declarative Scene Graph & Lifecycle**
   - Separate geometry, PBR material (`meshStandardMaterial` / `meshPhysicalMaterial`), lighting, and interaction state.
   - Always dispose of geometries, materials, and textures when swapping models or unmounting to prevent WebGL memory leaks.
   - Clamp `dpr` to `[1, 2]` (`Math.min(window.devicePixelRatio, 2)`) and use `powerPreference: "high-performance"`.

2. **Drei-Grade 3D Book & Product Showcase Patterns**
   - **Multi-Material 3D Book Mesh**: A realistic 3D book requires distinct materials per face or sub-mesh:
     - Front Cover: High-resolution texture (`THREE.SRGBColorSpace`, `anisotropy = 4+`, `roughness: 0.35`, `metalness: 0.05`, subtle clearcoat).
     - Spine & Back Cover: Rich leather/cloth material (`roughness: 0.65`) matching the book's `cover_color` with gold/embossed accents.
     - Page Block: Warm cream paper (`#f3ecdc`) with subtle horizontal stripe/ridge normal or bump detail.
   - **Float (`<Float>` pattern)**: Gentle continuous levitation using sine/cosine time offsets on `position.y`, `rotation.x`, and `rotation.z`—paused or blended smoothly during user pointer drag (`PresentationControls`).
   - **Contact Shadows & Warm Studio Lighting**:
     - Combine warm key light (`#ffe6bd`), cool rim light (`#a8d5cb`), and soft ground shadow plane beneath the floating book.
     - Add subtle floating dust/firefly particles (`THREE.Points` with additive blending and soft circular alpha) to give depth to the reading-room stage.

3. **Smooth Spring Interpolation (Damped Motion)**
   - Never snap 3D rotations or camera movements. Use frame-rate independent damping (`THREE.MathUtils.lerp` / `damp`) inside the render loop (`useFrame`).
   - When switching the featured book on the stage, animate a 360° spin + vertical lift transition while swapping the cover texture.

4. **Accessibility & Reduced Motion**
   - Respect `prefers-reduced-motion: reduce`: freeze autonomous floating and particle drift, while keeping direct pointer drag responsive.
