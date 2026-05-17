"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 1200;

export default function GoldParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds: number[] = [];

    const color1 = new THREE.Color("#FFD700"); // gold
    const color2 = new THREE.Color("#F0A500"); // deep gold
    const color3 = new THREE.Color("#FFEC8B"); // light gold

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      const mix = Math.random();
      const col = color1.clone().lerp(color2, mix).lerp(color3, Math.random() * 0.3);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 0.12 + 0.03;
      speeds[i] = Math.random() * 0.02 + 0.005;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Secondary small fast particles for depth
    const geo2 = new THREE.BufferGeometry();
    const pos2 = new Float32Array(400 * 3);
    const col2_arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      pos2[i * 3] = (Math.random() - 0.5) * 60;
      pos2[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos2[i * 3 + 2] = (Math.random() - 0.5) * 35;
      const c = new THREE.Color().setHSL(0.14, 1, 0.5 + Math.random() * 0.4);
      col2_arr[i * 3] = c.r;
      col2_arr[i * 3 + 1] = c.g;
      col2_arr[i * 3 + 2] = c.b;
    }
    geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    geo2.setAttribute("color", new THREE.BufferAttribute(col2_arr, 3));
    const mat2 = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.5,
    });
    const dust = new THREE.Points(geo2, mat2);
    scene.add(dust);

    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);

      const posArr = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        posArr[i * 3 + 1] -= speeds[i];
        if (posArr[i * 3 + 1] < -20) {
          posArr[i * 3 + 1] = 20;
          posArr[i * 3] = (Math.random() - 0.5) * 50;
          posArr[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      const pos2Arr = geo2.attributes.position.array as Float32Array;
      for (let i = 0; i < 400; i++) {
        pos2Arr[i * 3 + 1] -= 0.015 + Math.random() * 0.01;
        if (pos2Arr[i * 3 + 1] < -25) {
          pos2Arr[i * 3 + 1] = 25;
        }
      }
      geo2.attributes.position.needsUpdate = true;

      particles.rotation.y += 0.0003;
      dust.rotation.y -= 0.0005;
      dust.rotation.x += 0.0002;

      renderer.render(scene, camera);
    }

    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geometry.dispose();
      geo2.dispose();
      material.dispose();
      mat2.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "radial-gradient(ellipse at center, #1a1408 0%, #000000 70%)" }}
    />
  );
}
