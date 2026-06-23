import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RobotCanvasProps {
  scrollProgress: number; // 0 to 1 representing scroll position of landing page
  activeSection: string;  // 'landing' | 'auth' | 'profile' | 'dashboard' | 'whiteboard'
  visorState: 'eyes' | 'quote' | 'swap' | 'success' | 'camera';
}

export const RobotCanvas: React.FC<RobotCanvasProps> = ({
  scrollProgress,
  activeSection,
  visorState,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Keep refs of mesh objects for updates outside the render loop initializer
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const visorMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  
  // Visor dynamic 2D canvas texture refs
  const visorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visorTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Keep track of visorState, scrollProgress, and activeSection in refs to prevent recreating WebGL scene on change
  const visorStateRef = useRef(visorState);
  const scrollProgressRef = useRef(scrollProgress);
  const activeSectionRef = useRef(activeSection);

  useEffect(() => {
    visorStateRef.current = visorState;
    scrollProgressRef.current = scrollProgress;
    activeSectionRef.current = activeSection;
  }, [visorState, scrollProgress, activeSection]);

  // Track mouse coordinates for subtle head tracking
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse positions: -0.5 to +0.5
      mouseRef.current.x = (e.clientX / window.innerWidth) - 0.5;
      mouseRef.current.y = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Visor screen drawing logic
  const drawVisorTexture = (ctx: CanvasRenderingContext2D, state: string, time: number) => {
    // Clear canvas with dark futuristic dashboard background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, 256, 176);

    // Draw glowing tech dot-grid pattern with higher contrast opacity (18%)
    ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
    for (let x = 16; x < 256; x += 16) {
      for (let y = 16; y < 176; y += 16) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Draw a thick glowing rainbow gradient border bezel moved inward to prevent edge wrapping
    const gradient = ctx.createLinearGradient(0, 0, 256, 176);
    gradient.addColorStop(0, '#00f0ff');   // Cyan
    gradient.addColorStop(0.35, '#bd00ff'); // Purple
    gradient.addColorStop(0.65, '#ff007f'); // Pink
    gradient.addColorStop(1, '#ffea00');   // Yellow
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeRect(14, 14, 228, 148);

    ctx.shadowBlur = 15;
    
    if (state === 'eyes') {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      
      // blinking logic based on time
      const blink = Math.sin(time * 0.05) > 0.98;
      const eyeHeight = blink ? 2 : 26;
      
      // Draw left eye
      ctx.fillRect(72, 88 - eyeHeight / 2, 24, eyeHeight);
      // Draw right eye
      ctx.fillRect(160, 88 - eyeHeight / 2, 24, eyeHeight);

    } else if (state === 'quote') {
      ctx.fillStyle = '#bd00ff';
      ctx.shadowColor = '#bd00ff';
      ctx.font = 'bold 100px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Quote marks “
      ctx.fillText('“', 128, 105);

    } else if (state === 'swap') {
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left-to-right arrow
      ctx.beginPath();
      ctx.moveTo(60, 68);
      ctx.lineTo(190, 68);
      ctx.lineTo(165, 45);
      ctx.moveTo(190, 68);
      ctx.lineTo(165, 90);
      ctx.stroke();

      // Right-to-left arrow (colored Purple)
      ctx.strokeStyle = '#bd00ff';
      ctx.shadowColor = '#bd00ff';
      ctx.beginPath();
      ctx.moveTo(196, 118);
      ctx.lineTo(66, 118);
      ctx.lineTo(91, 95);
      ctx.moveTo(66, 118);
      ctx.lineTo(91, 140);
      ctx.stroke();

    } else if (state === 'success') {
      ctx.strokeStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw checkmark
      ctx.beginPath();
      ctx.moveTo(65, 90);
      ctx.lineTo(110, 132);
      ctx.lineTo(190, 52);
      ctx.stroke();
      
    } else if (state === 'camera') {
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      
      // Draw camera body
      ctx.strokeRect(78, 58, 100, 60);
      ctx.beginPath();
      ctx.arc(128, 88, 16, 0, Math.PI * 2);
      ctx.stroke();
      
      // Flash indicator
      ctx.fillStyle = '#bd00ff';
      ctx.shadowColor = '#bd00ff';
      ctx.beginPath();
      ctx.arc(96, 72, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Create 2D canvas for visor texture with 256x176 dimensions matching visor 3D aspect ratio
    const vCanvas = document.createElement('canvas');
    vCanvas.width = 256;
    vCanvas.height = 176;
    visorCanvasRef.current = vCanvas;

    const ctx = vCanvas.getContext('2d');
    if (ctx) {
      drawVisorTexture(ctx, visorState, 0);
    }

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.z = 8;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Dynamic Visor Texture
    const texture = new THREE.CanvasTexture(vCanvas);
    visorTextureRef.current = texture;

    // Materials - Premium White Glossy Ceramic (using MeshPhysicalMaterial for clearcoat reflection)
    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const visorScreenMaterial = new THREE.MeshBasicMaterial({
      map: texture,
    });
    visorMaterialRef.current = visorScreenMaterial;

    const blackPlastic = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.5,
      metalness: 0.2,
    });

    const glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
    });

    const glowPurpleMat = new THREE.MeshBasicMaterial({
      color: 0xbd00ff,
    });

    const glowPinkMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
    });

    // Create Robot group
    const robot = new THREE.Group();
    robotGroupRef.current = robot;
    scene.add(robot);

    // Robot Head Group (for independent rotation)
    const headGroup = new THREE.Group();
    headMeshRef.current = headGroup as unknown as THREE.Mesh;
    robot.add(headGroup);

    // Head base (slightly rounded box look via segments)
    const headGeo = new THREE.BoxGeometry(2.0, 1.8, 1.8, 4, 4, 4);
    const headMesh = new THREE.Mesh(headGeo, chromeMaterial);
    headGroup.add(headMesh);

    // Visor Frame
    const visorGeo = new THREE.BoxGeometry(1.6, 1.1, 0.1);
    const visorMesh = new THREE.Mesh(visorGeo, visorScreenMaterial);
    visorMesh.position.set(0, 0.1, 0.88);
    headGroup.add(visorMesh);

    // Ear Headphones (Left)
    const earLGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32);
    earLGeo.rotateZ(Math.PI / 2);
    const earL = new THREE.Mesh(earLGeo, blackPlastic);
    earL.position.set(-1.1, 0.1, 0);
    headGroup.add(earL);

    // Left Ring Glow
    const ringLGeo = new THREE.TorusGeometry(0.38, 0.06, 8, 32);
    ringLGeo.rotateY(Math.PI / 2);
    const ringL = new THREE.Mesh(ringLGeo, glowCyanMat);
    ringL.position.set(-1.26, 0.1, 0);
    headGroup.add(ringL);

    // Ear Headphones (Right)
    const earR = new THREE.Mesh(earLGeo, blackPlastic);
    earR.position.set(1.1, 0.1, 0);
    headGroup.add(earR);

    // Right Ring Glow
    const ringR = new THREE.Mesh(ringLGeo, glowPurpleMat);
    ringR.position.set(1.26, 0.1, 0);
    headGroup.add(ringR);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
    const neck = new THREE.Mesh(neckGeo, chromeMaterial);
    neck.position.set(0, -1.1, 0);
    robot.add(neck);

    // Torso / Chest Plate
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.8, 1.4, 4, 4, 4);
    const bodyMesh = new THREE.Mesh(bodyGeo, chromeMaterial);
    bodyMesh.position.set(0, -2.1, 0);
    robot.add(bodyMesh);

    // Three horizontal glowing dots under the screen visor (collar/chest)
    const dotGeo = new THREE.SphereGeometry(0.08, 16, 16);
    
    const dot1 = new THREE.Mesh(dotGeo, glowCyanMat);
    dot1.position.set(-0.35, -1.3, 0.75);
    robot.add(dot1);

    const dot2 = new THREE.Mesh(dotGeo, glowPinkMat);
    dot2.position.set(0, -1.3, 0.75);
    robot.add(dot2);

    const dot3 = new THREE.Mesh(dotGeo, glowPurpleMat);
    dot3.position.set(0.35, -1.3, 0.75);
    robot.add(dot3);

    // Lights - Bright front and side lights to highlight the glossy white ceramic body
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 3.5);
    frontLight.position.set(0, 2, 8);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
    topLight.position.set(5, 8, 5);
    scene.add(topLight);

    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 1.0);
    dirLight2.position.set(-6, 3, 2);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xbd00ff, 1.0);
    dirLight3.position.set(6, -3, 2);
    scene.add(dirLight3);

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 1;

      const currentScroll = scrollProgressRef.current;
      const currentSection = activeSectionRef.current;

      // Update robot base coordinates, scales, and base Y value on every frame
      if (robot) {
        if (currentSection === 'landing') {
          robot.rotation.y = currentScroll * Math.PI * 2.5; 
          const scale = 1.0 - (currentScroll * 0.25);
          robot.scale.set(scale, scale, scale);
          robot.position.x = -currentScroll * 0.5;
          robot.userData.baseY = -currentScroll * 1.5;
          robot.position.z = -currentScroll * 1.0;
        } else if (currentSection === 'auth') {
          robot.rotation.y = -Math.PI / 4 + currentScroll * Math.PI * 0.4;
          robot.scale.set(0.65, 0.65, 0.65);
          robot.position.x = -1.8 + currentScroll * 0.3;
          robot.userData.baseY = 0.5 - currentScroll * 0.8;
          robot.position.z = 0;
        } else if (currentSection === 'profile') {
          robot.rotation.y = Math.PI / 4 - currentScroll * Math.PI * 0.4;
          robot.scale.set(0.7, 0.7, 0.7);
          robot.position.x = 1.8 - currentScroll * 0.3;
          robot.userData.baseY = 0.5 - currentScroll * 0.8;
          robot.position.z = 0;
        } else if (currentSection === 'dashboard') {
          robot.rotation.y = currentScroll * Math.PI * 2.0;
          robot.scale.set(0.4, 0.4, 0.4);
          robot.position.x = 2.4 - currentScroll * 0.8;
          robot.userData.baseY = 1.6 - currentScroll * 0.6;
          robot.position.z = 0;
        } else if (currentSection === 'whiteboard') {
          robot.rotation.y = Math.PI / 6 + currentScroll * Math.PI * 0.3;
          robot.scale.set(0.3, 0.3, 0.3);
          robot.position.x = 2.8 - currentScroll * 0.5;
          robot.userData.baseY = 2.0 - currentScroll * 0.5;
          robot.position.z = 0;
        }

        // Apply float offset relative to scroll position
        const baseY = robot.userData.baseY || 0;
        robot.position.y = baseY + Math.sin(time * 0.015) * 0.15;
      }

      // Mouse tracking head rotation
      if (headGroup) {
        // Limit head rotation angle to look realistic
        const targetX = mouseRef.current.x * 0.4;
        const targetY = mouseRef.current.y * 0.3;
        headGroup.rotation.y += (targetX - headGroup.rotation.y) * 0.1;
        headGroup.rotation.x += (targetY - headGroup.rotation.x) * 0.1;
      }

      // Visor Texture Update
      if (ctx && visorCanvasRef.current && visorTextureRef.current) {
        drawVisorTexture(ctx, visorStateRef.current, time);
        visorTextureRef.current.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // Dispose materials/geometries to prevent memory leaks
      headGeo.dispose();
      visorGeo.dispose();
      earLGeo.dispose();
      ringLGeo.dispose();
      neckGeo.dispose();
      bodyGeo.dispose();
      dotGeo.dispose();
      chromeMaterial.dispose();
      visorScreenMaterial.dispose();
      blackPlastic.dispose();
      glowCyanMat.dispose();
      glowPurpleMat.dispose();
      glowPinkMat.dispose();
      texture.dispose();
    };
  }, []);



  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100vw', 
        height: 'calc(100vh - 120px)', 
        position: 'fixed',
        top: '70px',
        left: 0,
        pointerEvents: 'none',
        zIndex: 5
      }} 
    />
  );
};
export default RobotCanvas;
