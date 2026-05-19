package com.repository;

import com.entity.Scenario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScenarioRepository extends JpaRepository<Scenario, Long> {

    // Adımlarla birlikte getir — N+1 problemini önler
    @EntityGraph(attributePaths = {"steps"})
    List<Scenario> findAll();

    @EntityGraph(attributePaths = {"steps"})
    Optional<Scenario> findById(Long id);

    // Dashboard son 5 senaryo
    @EntityGraph(attributePaths = {"steps"})
    List<Scenario> findTop5ByOrderByIdDesc();
}