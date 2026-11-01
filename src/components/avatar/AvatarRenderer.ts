import { FacePose, AvatarConfig, AvatarInternalState, MouthShape } from './types';
import { AtlasAnimationController } from './AtlasAnimationController';
import { atlasFrameManager } from './AtlasFrameManager';

/**
 * AvatarRenderer
 * Next-Generation Holographic Canvas 2D Engine rendering Kyrsten's digital persona.
 * Supports:
 * 1. High-fidelity Atlas Sprite Animation (Source of Truth) via AtlasAnimationController
 * 2. Fallback procedural holographic rendering with live lip sync and particle aesthetics
 */
export class AvatarRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 400;
  private height: number = 440;
  private dpr: number = 1;
  private atlasController: AtlasAnimationController;
  private lastRenderTime: number = performance.now();

  // Particle shimmer system
  private particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    this.atlasController = new AtlasAnimationController(ctx);

    // Initialize 24 subtle ambient hologram particles
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 360,
        y: (Math.random() - 0.5) * 380,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.2 - Math.random() * 0.35,
        alpha: 0.15 + Math.random() * 0.45,
        size: 0.8 + Math.random() * 1.8,
      });
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const canvas = this.ctx.canvas;
    canvas.width = Math.floor(width * this.dpr);
    canvas.height = Math.floor(height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.atlasController.resize(width, height);
  }

  public render(
    pose: FacePose,
    config: AvatarConfig,
    state: AvatarInternalState,
    speechEnergy: number,
    activeViseme: string = 'REST'
  ) {
    // 1. If Animation Atlas is active, delegate directly to Atlas Animation Controller
    if (atlasFrameManager.getIsLoaded()) {
      const now = performance.now();
      const deltaSec = Math.min(0.1, Math.max(0.001, (now - this.lastRenderTime) / 1000));
      this.lastRenderTime = now;
      this.atlasController.render(
        now,
        deltaSec,
        pose,
        config,
        state,
        state === 'SPEAKING',
        speechEnergy,
        activeViseme
      );
      return;
    }

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 14;

    // Palette & Theme Setup
    const isMatrix = config.colorTheme === 'emerald_matrix';
    const isAmber = config.colorTheme === 'amber_plasma';
    const isViolet = config.colorTheme === 'electric_violet';
    const isPink = config.colorTheme === 'quantum_fusion';

    let primaryCyan = '#38bdf8';       // Sky cyan
    let deepBlue = '#0284c7';          // Deep sapphire
    let intenseGlow = 'rgba(56, 189, 248, 0.45)';
    let traceCore = '#e0f2fe';         // Bright circuit core
    let rimHighlight = '#bae6fd';

    if (isMatrix) {
      primaryCyan = '#34d399';
      deepBlue = '#059669';
      intenseGlow = 'rgba(52, 211, 153, 0.45)';
      traceCore = '#d1fae5';
      rimHighlight = '#a7f3d0';
    } else if (isAmber) {
      primaryCyan = '#fbbf24';
      deepBlue = '#d97706';
      intenseGlow = 'rgba(251, 191, 36, 0.45)';
      traceCore = '#fef3c7';
      rimHighlight = '#fde68a';
    } else if (isViolet) {
      primaryCyan = '#c084fc';
      deepBlue = '#9333ea';
      intenseGlow = 'rgba(192, 132, 252, 0.45)';
      traceCore = '#f3e8ff';
      rimHighlight = '#e9d5ff';
    } else if (isPink) {
      primaryCyan = '#f472b6';
      deepBlue = '#db2777';
      intenseGlow = 'rgba(244, 114, 182, 0.45)';
      traceCore = '#fce7f3';
      rimHighlight = '#fbcfe8';
    }

    // 1. Ambient Hologram Backdrop Glow
    this.renderBackdropGlow(ctx, centerX, centerY, intenseGlow, speechEnergy, state);

    // Head transform with 2.5D perspective parallax
    ctx.save();
    ctx.translate(centerX + pose.xOffset, centerY + pose.yOffset);
    ctx.rotate(pose.roll);

    const parallaxX = pose.yaw * 32;
    const parallaxY = pose.pitch * 22;

    // 2. Cybernetic Holographic Shoulders & Glowing Collar with Circuit Traces
    this.renderHologramBust(ctx, parallaxX, parallaxY, primaryCyan, traceCore, intenseGlow, speechEnergy, isMatrix);

    // 3. Flowing Long Hair (Back Layers draping behind neck)
    this.renderHairBack(ctx, parallaxX, parallaxY, primaryCyan, rimHighlight);

    // 4. Holographic Neck & Throat with Signature Rising Fiber-Optic Traces
    this.renderNeck(ctx, parallaxX, parallaxY, primaryCyan, traceCore, intenseGlow, speechEnergy);

    // 5. Delicate Holographic Ears
    this.renderEars(ctx, parallaxX, parallaxY, primaryCyan);

    // 6. Holographic 3D Facial Planes & Luminous Skin
    this.renderFacePlanes(ctx, pose, parallaxX, parallaxY, primaryCyan, deepBlue, rimHighlight);

    // 7. Facial Features with Perspective Parallax
    ctx.save();
    ctx.translate(parallaxX, parallaxY);

    // Eye Sockets & Holographic Eyebrows
    this.renderEyebrows(ctx, pose, primaryCyan);

    // Luminous Holographic Eyes (Sapphire Iris & Catchlights)
    this.renderEyes(ctx, pose, primaryCyan, deepBlue, traceCore, speechEnergy);

    // 3D Sculpted Holographic Nose
    this.renderNose(ctx, pose, primaryCyan, rimHighlight);

    // High-Fidelity 22-Viseme Lip Sync Mouth
    this.renderMouth(ctx, pose.mouth, primaryCyan, rimHighlight);

    ctx.restore();

    // 8. Front Cascading Hair Strands & Face-Framing Locks
    this.renderHairFront(ctx, parallaxX, parallaxY, primaryCyan, rimHighlight);

    // 9. Floating Hologram Micro-Particles
    this.renderParticles(ctx, primaryCyan, traceCore);

    // 10. Horizontal Holographic Scanlines Texture Overlay
    if (config.hologramGlow) {
      this.renderScanlines(ctx, w, h);
    }

    ctx.restore();
  }

  /**
   * 1. Ambient Hologram Backdrop Glow
   */
  private renderBackdropGlow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    glowColor: string,
    speechEnergy: number,
    state: AvatarInternalState
  ) {
    const pulse = state === 'SPEAKING' ? 1.0 + speechEnergy * 0.35 : 1.0;
    const radius = 185 * pulse;

    const radGrad = ctx.createRadialGradient(cx, cy - 25, 45, cx, cy - 25, radius);
    radGrad.addColorStop(0, glowColor);
    radGrad.addColorStop(0.45, 'rgba(14, 34, 61, 0.45)');
    radGrad.addColorStop(1, 'rgba(5, 10, 20, 0)');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 25, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 2. Holographic Shoulders & Glowing Collar with Circuit Traces
   * Matches reference image with glowing cybernetic tracks along shoulders and collarbones.
   */
  private renderHologramBust(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cyan: string,
    core: string,
    glow: string,
    speechEnergy: number,
    isMatrix: boolean
  ) {
    ctx.save();
    const bustY = 118;

    // Translucent cybernetic shoulder silhouette
    const bustGrad = ctx.createLinearGradient(0, bustY, 0, bustY + 110);
    bustGrad.addColorStop(0, 'rgba(30, 58, 110, 0.95)');
    bustGrad.addColorStop(0.35, 'rgba(15, 32, 67, 0.92)');
    bustGrad.addColorStop(0.8, 'rgba(8, 18, 38, 0.88)');
    bustGrad.addColorStop(1, 'rgba(4, 9, 20, 0.7)');

    ctx.fillStyle = bustGrad;
    ctx.beginPath();
    ctx.moveTo(-165, bustY + 95);
    ctx.bezierCurveTo(-155, bustY + 28, -95, bustY - 4, -48, bustY);
    ctx.quadraticCurveTo(0, bustY + 14, 48, bustY);
    ctx.bezierCurveTo(95, bustY - 4, 155, bustY + 28, 165, bustY + 95);
    ctx.closePath();
    ctx.fill();

    // Radiant outer rim lighting on shoulders
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-160, bustY + 90);
    ctx.bezierCurveTo(-150, bustY + 28, -95, bustY - 4, -48, bustY);
    ctx.moveTo(48, bustY);
    ctx.bezierCurveTo(95, bustY - 4, 150, bustY + 28, 160, bustY + 90);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cybernetic Clavicle & Shoulder Circuit Pathways
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 1.4;

    // Left shoulder horizontal circuit line
    ctx.beginPath();
    ctx.moveTo(-135, bustY + 50);
    ctx.lineTo(-85, bustY + 38);
    ctx.lineTo(-50, bustY + 22);
    ctx.stroke();

    // Right shoulder horizontal circuit line
    ctx.beginPath();
    ctx.moveTo(135, bustY + 50);
    ctx.lineTo(85, bustY + 38);
    ctx.lineTo(50, bustY + 22);
    ctx.stroke();

    // Circuit Data Nodes (Glowing dots on shoulders)
    ctx.fillStyle = core;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-85, bustY + 38, 2.2, 0, Math.PI * 2);
    ctx.arc(85, bustY + 38, 2.2, 0, Math.PI * 2);
    ctx.arc(-135, bustY + 50, 1.8, 0, Math.PI * 2);
    ctx.arc(135, bustY + 50, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Central sternum circuit junction
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-18, bustY + 45);
    ctx.lineTo(0, bustY + 28);
    ctx.lineTo(18, bustY + 45);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 3. Flowing Long Hair (Back Volume behind Head)
   * Long midnight-indigo locks cascading over both shoulders
   */
  private renderHairBack(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cyan: string,
    rim: string
  ) {
    ctx.save();

    // Deep midnight indigo base gradient
    const hairGrad = ctx.createLinearGradient(0, -150, 0, 160);
    hairGrad.addColorStop(0, '#0a162b');
    hairGrad.addColorStop(0.4, '#0e203f');
    hairGrad.addColorStop(0.8, '#081326');
    hairGrad.addColorStop(1, '#040914');

    ctx.fillStyle = hairGrad;

    // Flowing voluminous hair contour extending down to shoulders
    ctx.beginPath();
    ctx.moveTo(0, -138);
    ctx.bezierCurveTo(90, -138, 125, -75, 120, 25);
    ctx.bezierCurveTo(116, 95, 98, 155, 65, 175);
    ctx.lineTo(-65, 175);
    ctx.bezierCurveTo(-98, 155, -116, 95, -120, 25);
    ctx.bezierCurveTo(-125, -75, -90, -138, 0, -138);
    ctx.closePath();
    ctx.fill();

    // Ethereal cyan rim lighting on hair silhouette
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 3.0;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(-118, 30);
    ctx.bezierCurveTo(-122, -60, -90, -135, 0, -136);
    ctx.bezierCurveTo(90, -135, 122, -60, 118, 30);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * 4. Holographic Neck & Signature Rising Fiber-Optic Traces
   * Key element from the reference image: Two luminous blue-white circuit traces
   * rising from the collar/sternum up the throat towards the jaw angles.
   */
  private renderNeck(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cyan: string,
    core: string,
    glow: string,
    speechEnergy: number
  ) {
    ctx.save();

    // Holographic blue skin gradient for neck
    const neckGrad = ctx.createLinearGradient(-36, 62, 36, 128);
    neckGrad.addColorStop(0, '#5396e8');
    neckGrad.addColorStop(0.35, '#3b82f6');
    neckGrad.addColorStop(0.7, '#2563eb');
    neckGrad.addColorStop(1, '#1d4ed8');

    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(-35, 68);
    ctx.quadraticCurveTo(-39, 96, -44, 128);
    ctx.lineTo(44, 128);
    ctx.quadraticCurveTo(39, 96, 35, 68);
    ctx.closePath();
    ctx.fill();

    // Submental ambient shadow under chin
    const jawShadow = ctx.createRadialGradient(0, 72, 10, 0, 72, 48);
    jawShadow.addColorStop(0, 'rgba(10, 25, 55, 0.7)');
    jawShadow.addColorStop(0.65, 'rgba(15, 35, 75, 0.35)');
    jawShadow.addColorStop(1, 'rgba(15, 35, 75, 0)');

    ctx.fillStyle = jawShadow;
    ctx.beginPath();
    ctx.ellipse(0, 74, 44, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // SIGNATURE FIBER-OPTIC CIRCUIT TRACES (From Reference Image)
    // Left and right luminous tracks curving up along the throat
    const tracePulse = 1.0 + speechEnergy * 0.45;

    ctx.save();
    ctx.lineCap = 'round';

    // 1. Broad Neon Cyan Outer Halo
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 4.5 * tracePulse;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 18 * tracePulse;

    // Left curved trace
    ctx.beginPath();
    ctx.moveTo(-4, 126);
    ctx.bezierCurveTo(-14, 110, -22, 92, -25, 74);
    ctx.stroke();

    // Right curved trace
    ctx.beginPath();
    ctx.moveTo(4, 126);
    ctx.bezierCurveTo(14, 110, 22, 92, 25, 74);
    ctx.stroke();

    // 2. Crisp White-Cyan Inner Energy Core
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(-4, 126);
    ctx.bezierCurveTo(-14, 110, -22, 92, -25, 74);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 126);
    ctx.bezierCurveTo(14, 110, 22, 92, 25, 74);
    ctx.stroke();

    // Subtle central neck vertical micro-trace
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, 124);
    ctx.lineTo(0, 96);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }

  /**
   * 5. Delicate Holographic Ears
   */
  private renderEars(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cyan: string
  ) {
    ctx.save();

    // Left Ear
    const earGradL = ctx.createLinearGradient(-75, -20, -65, 15);
    earGradL.addColorStop(0, '#599df0');
    earGradL.addColorStop(1, '#2563eb');
    ctx.fillStyle = earGradL;
    ctx.beginPath();
    ctx.ellipse(-72 + px * 0.2, -2 + py * 0.2, 6.5, 17, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Right Ear
    const earGradR = ctx.createLinearGradient(65, -20, 75, 15);
    earGradR.addColorStop(0, '#4b8ee3');
    earGradR.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = earGradR;
    ctx.beginPath();
    ctx.ellipse(72 + px * 0.2, -2 + py * 0.2, 6.5, 17, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 6. Holographic 3D Facial Planes & Luminous Skin
   * Delicate feminine facial contours with subtle blue-toned holographic shading.
   */
  private renderFacePlanes(
    ctx: CanvasRenderingContext2D,
    pose: FacePose,
    px: number,
    py: number,
    cyan: string,
    deepBlue: string,
    rim: string
  ) {
    ctx.save();

    const chinDrop = pose.mouth.jawOpen * 7.5;

    // Refined feminine cranial & mandibular silhouette
    ctx.beginPath();
    ctx.moveTo(0, -114); // Forehead top
    ctx.bezierCurveTo(53, -114, 75, -82, 75, -34);
    ctx.bezierCurveTo(76, 6, 66, 48, 33, 82 + chinDrop);
    ctx.bezierCurveTo(18, 96 + chinDrop, -18, 96 + chinDrop, -33, 82 + chinDrop);
    ctx.bezierCurveTo(-66, 48, -76, 6, -75, -34);
    ctx.bezierCurveTo(-75, -82, -53, -114, 0, -114);
    ctx.closePath();

    // 3D Hologram Skin Gradient (Soft light from top-center)
    const skinGrad = ctx.createRadialGradient(
      -10 + px * 0.4,
      -22 + py * 0.4,
      20,
      0,
      12,
      105
    );
    skinGrad.addColorStop(0, '#bae6fd');   // Radiant light blue highlight
    skinGrad.addColorStop(0.35, '#7dd3fc'); // Luminous sky tone
    skinGrad.addColorStop(0.65, '#38bdf8'); // Primary holographic cyan
    skinGrad.addColorStop(0.85, '#0284c7'); // Soft mandibular contour
    skinGrad.addColorStop(1, '#0369a1');    // Deep edge shadow

    ctx.fillStyle = skinGrad;
    ctx.fill();

    // Soft rosy-violet cheek blush (giving subtle human warmth to the hologram)
    const blushL = ctx.createRadialGradient(-38, 14, 2, -38, 14, 28);
    blushL.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
    blushL.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = blushL;
    ctx.beginPath();
    ctx.ellipse(-38, 14, 28, 16, -0.15, 0, Math.PI * 2);
    ctx.fill();

    const blushR = ctx.createRadialGradient(38, 14, 2, 38, 14, 28);
    blushR.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
    blushR.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = blushR;
    ctx.beginPath();
    ctx.ellipse(38, 14, 28, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // High cheekbone specular highlights
    const cheekSpecL = ctx.createRadialGradient(-35, -2, 2, -35, -2, 18);
    cheekSpecL.addColorStop(0, 'rgba(240, 249, 255, 0.4)');
    cheekSpecL.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = cheekSpecL;
    ctx.beginPath();
    ctx.arc(-35, -2, 18, 0, Math.PI * 2);
    ctx.fill();

    const cheekSpecR = ctx.createRadialGradient(35, -2, 2, 35, -2, 18);
    cheekSpecR.addColorStop(0, 'rgba(240, 249, 255, 0.4)');
    cheekSpecR.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = cheekSpecR;
    ctx.beginPath();
    ctx.arc(35, -2, 18, 0, Math.PI * 2);
    ctx.fill();

    // Delicate chin highlight
    const chinGrad = ctx.createRadialGradient(0, 80 + chinDrop, 2, 0, 80 + chinDrop, 14);
    chinGrad.addColorStop(0, 'rgba(240, 249, 255, 0.5)');
    chinGrad.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = chinGrad;
    ctx.beginPath();
    ctx.arc(0, 80 + chinDrop, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 7. Eyebrows
   */
  private renderEyebrows(ctx: CanvasRenderingContext2D, pose: FacePose, cyan: string) {
    ctx.save();

    const browLeftY = -44 - pose.eyebrowLeft * 7;
    const browRightY = -44 - pose.eyebrowRight * 7;

    ctx.strokeStyle = '#0f274a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    // Left Eyebrow (Arch)
    ctx.beginPath();
    ctx.moveTo(-48, browLeftY + 3);
    ctx.quadraticCurveTo(-34, browLeftY - 5, -16, browLeftY);
    ctx.stroke();

    // Right Eyebrow (Arch)
    ctx.beginPath();
    ctx.moveTo(16, browRightY);
    ctx.quadraticCurveTo(34, browRightY - 5, 48, browRightY + 3);
    ctx.stroke();

    // Subtle holographic cyan sheen on eyebrow arch
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-46, browLeftY + 2);
    ctx.quadraticCurveTo(-34, browLeftY - 4, -18, browLeftY);
    ctx.moveTo(18, browRightY);
    ctx.quadraticCurveTo(34, browRightY - 4, 46, browRightY + 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 8. Luminous Holographic Eyes (Sapphire Iris, Neural Filaments, Catchlights)
   */
  private renderEyes(
    ctx: CanvasRenderingContext2D,
    pose: FacePose,
    cyan: string,
    deepBlue: string,
    core: string,
    speechEnergy: number
  ) {
    const eyeY = -24;
    const eyeDist = 32;

    this.renderSingleEye(ctx, -eyeDist, eyeY, false, pose.blinkLeft, pose.eyeGazeX, pose.eyeGazeY, cyan, deepBlue, core, speechEnergy);
    this.renderSingleEye(ctx, eyeDist, eyeY, true, pose.blinkRight, pose.eyeGazeX, pose.eyeGazeY, cyan, deepBlue, core, speechEnergy);
  }

  private renderSingleEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isRight: boolean,
    blink: number,
    gazeX: number,
    gazeY: number,
    cyan: string,
    deepBlue: string,
    core: string,
    speechEnergy: number
  ) {
    ctx.save();
    ctx.translate(x, y);

    const eyeW = 17;
    const eyeH = 9.5 * (1 - blink * 0.95);

    // Eyelid / Sclera clipping boundary
    ctx.beginPath();
    ctx.moveTo(-eyeW, 0);
    ctx.bezierCurveTo(-eyeW * 0.5, -eyeH * 1.25, eyeW * 0.5, -eyeH * 1.25, eyeW, 0);
    ctx.bezierCurveTo(eyeW * 0.5, eyeH * 1.15, -eyeW * 0.5, eyeH * 1.15, -eyeW, 0);
    ctx.closePath();

    if (blink < 0.9) {
      ctx.save();
      ctx.clip();

      // Sclera (Soft tinted crystalline white)
      const scleraGrad = ctx.createLinearGradient(0, -eyeH, 0, eyeH);
      scleraGrad.addColorStop(0, '#e0f2fe');
      scleraGrad.addColorStop(0.5, '#f8fafc');
      scleraGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = scleraGrad;
      ctx.fill();

      // Iris offset from gaze tracking
      const irisX = gazeX * 3.5;
      const irisY = gazeY * 2.2;
      const irisRadius = 7.2;

      // Outer limbal ring (Deep navy)
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(irisX, irisY, irisRadius + 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Luminous Sapphire & Electric Cyan Iris Gradient
      const irisGrad = ctx.createRadialGradient(irisX, irisY, 1, irisX, irisY, irisRadius);
      irisGrad.addColorStop(0, '#38bdf8');   // Center luminous cyan
      irisGrad.addColorStop(0.45, '#0284c7'); // Mid sapphire
      irisGrad.addColorStop(0.85, '#0369a1'); // Deep outer ring
      irisGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(irisX, irisY, irisRadius, 0, Math.PI * 2);
      ctx.fill();

      // Radial Iris Filaments (Cybernetic texture)
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
      ctx.lineWidth = 0.8;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(irisX + Math.cos(angle) * 2, irisY + Math.sin(angle) * 2);
        ctx.lineTo(irisX + Math.cos(angle) * 5.8, irisY + Math.sin(angle) * 5.8);
        ctx.stroke();
      }

      // Pupil (Deep black with central cyan glimmer)
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(irisX, irisY, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Primary Corneal Specular Catchlight (Upper-Left at 10 o'clock)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(irisX - 2.2, irisY - 2.2, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Secondary Delicate Specular Catchlight (Lower-Right at 4 o'clock)
      ctx.fillStyle = 'rgba(240, 249, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(irisX + 1.8, irisY + 1.6, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // Upper Eyelash Line & Subtle Wing
    ctx.strokeStyle = '#081a33';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-eyeW - 1, 0.5);
    ctx.bezierCurveTo(-eyeW * 0.5, -eyeH * 1.25, eyeW * 0.5, -eyeH * 1.25, eyeW + 1.5, -1.0);
    ctx.stroke();

    // Delicate holographic cyan eyeliner glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-eyeW, 0);
    ctx.bezierCurveTo(-eyeW * 0.5, -eyeH * 1.15, eyeW * 0.5, -eyeH * 1.15, eyeW + 1, -1.5);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 9. 3D Sculpted Holographic Nose
   */
  private renderNose(
    ctx: CanvasRenderingContext2D,
    pose: FacePose,
    cyan: string,
    rim: string
  ) {
    ctx.save();
    const noseY = 12;

    // Subtle nose bridge vertical specular highlight
    const bridgeGrad = ctx.createLinearGradient(0, -18, 0, noseY + 6);
    bridgeGrad.addColorStop(0, 'rgba(240, 249, 255, 0.1)');
    bridgeGrad.addColorStop(0.65, 'rgba(240, 249, 255, 0.45)');
    bridgeGrad.addColorStop(1, 'rgba(240, 249, 255, 0.65)');

    ctx.fillStyle = bridgeGrad;
    ctx.beginPath();
    ctx.moveTo(-1.6, -16);
    ctx.lineTo(1.6, -16);
    ctx.lineTo(2.4, noseY + 4);
    ctx.lineTo(-2.4, noseY + 4);
    ctx.closePath();
    ctx.fill();

    // Nose tip specular glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, noseY + 4, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Delicate feminine nostrils and soft base curve
    ctx.strokeStyle = '#0f274a';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-7.5, noseY + 5);
    ctx.quadraticCurveTo(-4, noseY + 7.5, 0, noseY + 7.5);
    ctx.quadraticCurveTo(4, noseY + 7.5, 7.5, noseY + 5);
    ctx.stroke();

    // Nostril indentations
    ctx.fillStyle = 'rgba(10, 25, 55, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-4.2, noseY + 5.5, 1.4, 0.9, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4.2, noseY + 5.5, 1.4, 0.9, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 10. High-Fidelity 22-Viseme Lip Sync Mouth
   * Contoured lips with subtle holographic pink-cyan gloss, jaw depression,
   * teeth visibility, and lower lip tuck/pucker.
   */
  private renderMouth(
    ctx: CanvasRenderingContext2D,
    mouth: MouthShape,
    cyan: string,
    rim: string
  ) {
    ctx.save();
    const mouthY = 46;

    const baseWidth = 19 + mouth.mouthWidth * 11;
    const openH = mouth.jawOpen * 16;
    const smileLift = mouth.smile * 5.5;

    // Corner positions
    const cornerLX = -baseWidth;
    const cornerRX = baseWidth;
    const cornerY = mouthY - smileLift;

    // Oral Cavity (When mouth is open)
    if (mouth.jawOpen > 0.05) {
      ctx.save();

      // Cavity boundary
      ctx.beginPath();
      ctx.moveTo(cornerLX, cornerY);
      ctx.quadraticCurveTo(0, mouthY - openH * 0.35, cornerRX, cornerY);
      ctx.quadraticCurveTo(0, mouthY + openH * 1.1, cornerLX, cornerY);
      ctx.closePath();
      ctx.clip();

      // Deep dark cavity
      ctx.fillStyle = '#061326';
      ctx.fill();

      // Tongue (When raised)
      if (mouth.tongueRaise > 0.05) {
        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + openH * 0.65 - mouth.tongueRaise * 4, baseWidth * 0.6, openH * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper Teeth (Pearl white with clean edge)
      if (mouth.teethVisible > 0.1 || mouth.jawOpen > 0.12) {
        const teethH = Math.min(5.5, openH * 0.55 * mouth.teethVisible);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.rect(-baseWidth * 0.55, mouthY - openH * 0.25, baseWidth * 1.1, teethH);
        ctx.fill();

        // Subtle teeth separator lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 0.6;
        for (let t = -baseWidth * 0.3; t <= baseWidth * 0.3; t += baseWidth * 0.2) {
          ctx.beginPath();
          ctx.moveTo(t, mouthY - openH * 0.25);
          ctx.lineTo(t, mouthY - openH * 0.25 + teethH);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Upper Lip (Cupid's Bow)
    const upperLipH = 4.2 + mouth.upperLipLift * 3;
    const upperGrad = ctx.createLinearGradient(0, mouthY - upperLipH - 2, 0, mouthY);
    upperGrad.addColorStop(0, '#ec4899');   // Soft pink-rose base
    upperGrad.addColorStop(0.5, '#7dd3fc'); // Holographic cyan sheen
    upperGrad.addColorStop(1, '#0284c7');

    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(cornerLX, cornerY);
    // Outer Cupid's bow curve
    ctx.bezierCurveTo(-baseWidth * 0.5, mouthY - upperLipH - 1, -baseWidth * 0.15, mouthY - upperLipH - 3, 0, mouthY - upperLipH);
    ctx.bezierCurveTo(baseWidth * 0.15, mouthY - upperLipH - 3, baseWidth * 0.5, mouthY - upperLipH - 1, cornerRX, cornerY);
    // Inner lip contour
    ctx.quadraticCurveTo(0, mouthY - openH * 0.2, cornerLX, cornerY);
    ctx.closePath();
    ctx.fill();

    // Lower Lip
    const lowerLipH = 6.2 + mouth.lowerLipDepress * 4.5;
    const lowerGrad = ctx.createLinearGradient(0, mouthY, 0, mouthY + lowerLipH + openH);
    lowerGrad.addColorStop(0, '#7dd3fc');   // Cyan sheen
    lowerGrad.addColorStop(0.4, '#f472b6'); // Rose glow
    lowerGrad.addColorStop(1, '#0369a1');

    ctx.fillStyle = lowerGrad;
    ctx.beginPath();
    ctx.moveTo(cornerLX, cornerY);
    // Inner lower lip contour
    ctx.quadraticCurveTo(0, mouthY + openH * 0.2, cornerRX, cornerY);
    // Outer lower lip fullness curve
    ctx.bezierCurveTo(baseWidth * 0.55, mouthY + lowerLipH + openH, -baseWidth * 0.55, mouthY + lowerLipH + openH, cornerLX, cornerY);
    ctx.closePath();
    ctx.fill();

    // Lower Lip Gloss Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, mouthY + openH * 0.6 + 3.2, baseWidth * 0.32, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Corner of the mouth shadow dots
    ctx.fillStyle = '#081a33';
    ctx.beginPath();
    ctx.arc(cornerLX, cornerY, 1.2, 0, Math.PI * 2);
    ctx.arc(cornerRX, cornerY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 11. Front Cascading Hair Strands & Face-Framing Locks
   * Delicate front bangs and locks draping down the sides of the face and neck.
   */
  private renderHairFront(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cyan: string,
    rim: string
  ) {
    ctx.save();

    // Deep midnight indigo strand gradient
    const strandGrad = ctx.createLinearGradient(0, -120, 0, 120);
    strandGrad.addColorStop(0, '#0a172e');
    strandGrad.addColorStop(0.45, '#0e2243');
    strandGrad.addColorStop(0.85, '#071224');
    strandGrad.addColorStop(1, '#030814');

    ctx.fillStyle = strandGrad;

    // Left face-framing hair curtain
    ctx.beginPath();
    ctx.moveTo(-18, -126);
    ctx.bezierCurveTo(-65, -122, -88, -70, -78, 12);
    ctx.bezierCurveTo(-72, 60, -56, 110, -48, 150);
    ctx.quadraticCurveTo(-64, 120, -74, 65);
    ctx.bezierCurveTo(-86, 10, -96, -60, -50, -120);
    ctx.closePath();
    ctx.fill();

    // Right face-framing hair curtain
    ctx.beginPath();
    ctx.moveTo(18, -126);
    ctx.bezierCurveTo(65, -122, 88, -70, 78, 12);
    ctx.bezierCurveTo(72, 60, 56, 110, 48, 150);
    ctx.quadraticCurveTo(64, 120, 74, 65);
    ctx.bezierCurveTo(86, 10, 96, -60, 50, -120);
    ctx.closePath();
    ctx.fill();

    // Luminous electric cyan hairline edge highlights
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 8;

    // Left strand highlight
    ctx.beginPath();
    ctx.moveTo(-22, -120);
    ctx.bezierCurveTo(-65, -116, -82, -65, -74, 14);
    ctx.bezierCurveTo(-68, 62, -54, 112, -48, 148);
    ctx.stroke();

    // Right strand highlight
    ctx.beginPath();
    ctx.moveTo(22, -120);
    ctx.bezierCurveTo(65, -116, 82, -65, 74, 14);
    ctx.bezierCurveTo(68, 62, 54, 112, 48, 148);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /**
   * 12. Floating Hologram Micro-Particles
   */
  private renderParticles(ctx: CanvasRenderingContext2D, cyan: string, core: string) {
    ctx.save();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap-around
      if (p.y < -200) {
        p.y = 200;
        p.x = (Math.random() - 0.5) * 320;
      }

      ctx.fillStyle = core;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  /**
   * 13. Horizontal Holographic Scanlines Texture Overlay
   * Adds the signature Cortana holographic scanline texture.
   */
  private renderScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(186, 230, 253, 0.055)';

    // 2.5px spacing horizontal lines
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    ctx.restore();
  }
}
