import React, { useEffect } from 'react';
import styled from 'styled-components';
import Head from 'next/head';
import * as THREE from 'three';
import useWindowDimensions from './utils/UseWindowDimensions';

const HomeDiv = styled.div`
  background-repeat: no-repeat;
  background-image: linear-gradient(168deg, #ffffff, #999);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  min-width: 100vw;
  z-index: -5;
`;

const Canvas = styled.div`
  position: fixed;
  top: 0;
  left: 0;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: fit-content;
  padding-bottom: 5rem;
  z-index: 5;
`;

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

const Layout = props => {
  const dimensions = useWindowDimensions();

  // === THREE.JS CODE START ===
  useEffect(() => {
    var mouse = new THREE.Vector2(0, 0);
    document.onmousemove = event => {
      mouse.x = (event.clientX / dimensions.width) * 2 - 1;
      mouse.y = -(event.clientY / dimensions.height) * 2 + 1;
    };
    const particleCount = 5000;
    const particles = new THREE.BufferGeometry();
    const pMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: '#000000',
      map: new THREE.TextureLoader().load('/particle.png'),
      blending: THREE.AdditiveBlending,
      // transparent: true,
    });

    // particleSystem.
    // particleSystem.sortParticles = true;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, dimensions.width / dimensions.height, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('canvas').appendChild(renderer.domElement);
    camera.position.z = 5;

    const visibleWidth = visibleWidthAtZDepth(0, camera);
    const visibleHeight = visibleHeightAtZDepth(0, camera);

    const positions = [];
    const velocities = [];
    const angles = [];
    for (let i = 0; i < particleCount; i++) {
      positions.push(
        Math.random() * visibleWidth - visibleWidth / 2,
        Math.random() * visibleHeight - visibleHeight / 2,
        0,
      );
      // velocities.push(Math.random() * 0.01 + 0.001, Math.random() * 0.1 * Math.PI, 0);
      velocities.push(0.01 + 0.001, 0.01 * Math.PI, 0);

      angles.push(Math.random() * 2 * Math.PI);

      // velocities.push(
      //   (Math.round(Math.random()) * 2 - 1) * (Math.random() * 0.002 + 0.01),
      //   (Math.round(Math.random()) * 2 - 1) * (Math.random() * 0.002 + 0.007),
      //   0,
      // );
    }
    particles.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(velocities), 3));
    particles.setAttribute('angles', new THREE.BufferAttribute(new Float32Array(angles), 1));

    console.log(particles.attributes.velocity);
    console.log(particles.attributes.angles);

    const particleSystem = new THREE.Points(particles, pMaterial);

    scene.add(particleSystem);

    const clock = new THREE.Clock();
    console.log(particleSystem);
    console.log(particles);

    const pi2 = Math.PI * 2;

    const pps = particles.attributes.position;
    const pvs = particles.attributes.velocity;
    const pas = particles.attributes.angles;

    const updatePositions = () => {
      for (let i = 0, l = particleCount; i < l; i++) {
        let angle = pas.getX(i);
        let v = pvs.getX(i);
        pps.setXY(i, pps.getX(i) + v * Math.cos(angle), pps.getY(i) + v * Math.sin(angle));

        if (pps.getX(i) > visibleWidth / 2 || pps.getX(i) < -visibleWidth / 2) {
          pas.setX(i, Math.atan2(v * Math.sin(angle), -v * Math.cos(angle)));

          // if (pps.getX(i) > visibleWidth / 2) {
          //   pps.setX(i, visibleWidth / 2 + v * Math.cos(angle));
          // } else {
          //   pps.setX(i, -visibleWidth / 2 + v * Math.cos(angle));
          // }
        } else if (pps.getY(i) > visibleHeight / 2 || pps.getY(i) < -visibleHeight / 2) {
          pas.setX(i, Math.atan2(-v * Math.sin(angle), v * Math.cos(angle)));
          // if (pps.getY(i) > visibleHeight / 2) {
          //   pps.setY(i, visibleHeight / 2 + v * Math.sin(angle));
          // } else {
          //   pps.setY(i, -visibleHeight / 2 + v * Math.sin(angle));
          // }
        } else if (i % 100 !== 0 && i > 0) {
          let goalAngle = Math.atan2(pps.getY(i - 1) - pps.getY(i), pps.getX(i - 1) - pps.getX(i));
          let newAngle =
            ((goalAngle - angle + Math.PI) % pi2) - Math.PI < pvs.getY(i)
              ? goalAngle
              : goalAngle > (angle + Math.PI) % pi2
              ? angle - pvs.getY(i)
              : angle + pvs.getY(i);
          pas.setX(i, newAngle % pi2);
        } else {
        }
        // pas.setX(i, (angle + pvs.getY(i)) % pi2);
      }
    };

    var animate = function () {
      updatePositions();
      particles.attributes.position.needsUpdate = true;

      // for (let i = 0; i < particleCount * 3; i++) {
      //   particles.attributes.position.array[0] += 0.02;
      // }

      // particles.attributes.position.array.forEach((item, i) => {
      //   particles.attributes.position.array[i] += 0.01;
      // });
      // particles.forEeach();
      // const time = clock.getElapsedTime();
      // particleSystem.rotation.y = 0.025 * time;
      // particleSystem.rotation.x = 0.01 * time;

      // if (mouse.x > -250) {
      //   particleSystem.rotation.y = mouse.x + time * 0.025;
      //   particleSystem.rotation.x = -mouse.y + time * 0.01;
      // }
      particleSystem.material.color.set('#00ffff');

      // if (renderer.width !== dimensions.width || renderer.height !== dimensions.height) {
      //   renderer.setSize(dimensions.width, dimensions.height);
      // }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  }, [dimensions]);

  return (
    <HomeDiv>
      <Head>
        <title>ThreeJS Sandbox</title>
      </Head>
      <Canvas id="canvas" />
      <Body>{props.children}</Body>
    </HomeDiv>
  );
};

export default Layout;
