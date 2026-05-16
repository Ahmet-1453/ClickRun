package com.repository;

import com.aft.compact.entity.TestRunDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TestRunDetailRepository extends JpaRepository<TestRunDetail, Long> {
    Optional<TestRunDetail> findByTestRunId(Long testRunId);
}
